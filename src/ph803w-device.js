const net = require("net");
const EventEmitter = require("events");

const DEFAULT_RESPONSE_TIMEOUT_MS = 5000;
const DEFAULT_PING_INTERVAL_MS = 4000;

function createDeferred() {
  let resolve;
  let reject;

  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

class Ph803wDevice extends EventEmitter {
  constructor(options) {
    super();

    if (!options?.ip) {
      throw new Error("PH803W IP fehlt");
    }

    this.ip = options.ip;
    this.port = options.port;
    this.responseTimeoutMs =
      options.responseTimeoutMs || DEFAULT_RESPONSE_TIMEOUT_MS;
    this.pingIntervalMs = options.pingIntervalMs || DEFAULT_PING_INTERVAL_MS;

    this.socket = null;
    this.connected = false;
    this.pending = new Map();
    this.pingTimer = null;
    this.pingWatchdogTimer = null;
  }

  async connect() {
    if (this.socket) {
      throw new Error("Socket ist bereits verbunden");
    }

    return new Promise((resolve, reject) => {
      const socket = new net.Socket();

      const onErrorBeforeConnect = (err) => {
        cleanup();
        socket.destroy();
        reject(err);
      };

      const cleanup = () => {
        socket.removeListener("error", onErrorBeforeConnect);
      };

      socket.once("error", onErrorBeforeConnect);

      socket.connect(this.port, this.ip, () => {
        cleanup();

        this.socket = socket;
        this.connected = true;

        socket.on("data", (data) => this.handleData(data));
        socket.on("error", (err) => this.handleSocketError(err));
        socket.on("close", () => this.handleSocketClose());
        socket.on("end", () => this.handleSocketClose());
        socket.setKeepAlive(true, 15000);

        this.emit("connected");
        resolve(true);
      });
    });
  }

  async disconnect() {
    this.cleanupSocketState();
    return true;
  }

  handleSocketError(err) {
    this.emit("error", err);
    this.cleanupSocketState();
  }

  handleSocketClose() {
    const wasConnected = this.connected;
    this.cleanupSocketState();

    if (wasConnected) {
      this.emit("disconnected");
    }
  }

  cleanupSocketState() {
    this.connected = false;

    if (this.pingTimer) {
      clearTimeout(this.pingTimer);
      this.pingTimer = null;
    }

    if (this.pingWatchdogTimer) {
      clearTimeout(this.pingWatchdogTimer);
      this.pingWatchdogTimer = null;
    }

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.destroy();
      this.socket = null;
    }

    for (const [, entry] of this.pending.entries()) {
      clearTimeout(entry.timeout);
      entry.reject(new Error("Verbindung zum PH803W verloren"));
    }

    this.pending.clear();
  }

  sendAndWait(buffer, responseType) {
    if (!this.socket) {
      return Promise.reject(new Error("Keine Socket-Verbindung vorhanden"));
    }

    if (this.pending.has(responseType)) {
      return this.pending.get(responseType).promise;
    }

    const deferred = createDeferred();

    const timeout = setTimeout(() => {
      this.pending.delete(responseType);
      deferred.reject(
        new Error(
          `Timeout beim Warten auf Antworttyp 0x${responseType.toString(16)}`
        )
      );
    }, this.responseTimeoutMs);

    this.pending.set(responseType, {
      ...deferred,
      timeout,
      promise: deferred.promise
    });

    this.socket.write(buffer);

    return deferred.promise;
  }

  resolvePending(responseType, value) {
    const entry = this.pending.get(responseType);
    if (!entry) return;

    clearTimeout(entry.timeout);
    this.pending.delete(responseType);
    entry.resolve(value);
  }

  rejectPending(responseType, error) {
    const entry = this.pending.get(responseType);
    if (!entry) return;

    clearTimeout(entry.timeout);
    this.pending.delete(responseType);
    entry.reject(error);
  }

  async getPasscode() {
    const request = Buffer.from("0000000303000006", "hex");
    return this.sendAndWait(request, 0x07);
  }

  async login(passcodeBuffer = null) {
    let passcode = passcodeBuffer;

    if (!passcode) {
      passcode = await this.getPasscode();
    }

    if (!Buffer.isBuffer(passcode)) {
      throw new Error("Ungültiger Passcode vom Gerät");
    }

    const loginHeader = Buffer.from("00000003030000080000", "hex");
    loginHeader.writeUInt8(passcode.length, loginHeader.length - 1);
    loginHeader.writeUInt8(5 + passcode.length, 4);

    return this.sendAndWait(Buffer.concat([loginHeader, passcode]), 0x09);
  }

  async retrieveData() {
    const request = Buffer.from("000000030400009002", "hex");
    return this.sendAndWait(request, 0x91);
  }

  sendPing() {
    if (!this.socket) {
      return;
    }

    if (this.pingTimer) {
      clearTimeout(this.pingTimer);
      this.pingTimer = null;
    }

    if (this.pingWatchdogTimer) {
      clearTimeout(this.pingWatchdogTimer);
      this.pingWatchdogTimer = null;
    }

    const request = Buffer.from("0000000303000015", "hex");
    this.socket.write(request);

    this.pingWatchdogTimer = setTimeout(() => {
      this.emit("error", new Error("PH803W Ping-Timeout"));
      this.disconnect().catch(() => {});
    }, this.pingIntervalMs * 2);
  }

  schedulePing() {
    if (this.pingTimer) {
      clearTimeout(this.pingTimer);
    }

    this.pingTimer = setTimeout(() => {
      this.pingTimer = null;
      this.sendPing();
    }, this.pingIntervalMs);
  }

  handleData(data) {
    if (!Buffer.isBuffer(data) || data.length < 8) {
      return;
    }

    if (
      data[0] !== 0x00 ||
      data[1] !== 0x00 ||
      data[2] !== 0x00 ||
      data[3] !== 0x03
    ) {
      this.emit("error", new Error("Ungültiger Datenpräfix vom Gerät"));
      return;
    }

    const dataLength = data[4];
    const messageType = data[7];

    if (data.length !== dataLength + 5) {
      this.emit("error", new Error("Ungültige Datenlänge vom Gerät"));
      return;
    }

    switch (messageType) {
      case 0x07:
        this.handlePasscodeResponse(data);
        break;
      case 0x09:
        this.handleLoginResponse(data);
        break;
      case 0x16:
        this.handlePongResponse();
        break;
      case 0x91:
        this.handleMeasurementResponse(data);
        break;
      case 0x94:
        this.handleExtendedMeasurementResponse(data);
        break;
      default:
        this.emit(
          "error",
          new Error(`Unbekannter Nachrichtentyp 0x${messageType.toString(16)}`)
        );
        break;
    }
  }

  handlePasscodeResponse(data) {
    const passcodeLength = data[9];
    const passcode = Buffer.alloc(passcodeLength);
    data.copy(passcode, 0, 10, 10 + passcodeLength);

    this.resolvePending(0x07, passcode);
  }

  handleLoginResponse(data) {
    if (data[8] === 0x00) {
      this.resolvePending(0x09, true);
      this.schedulePing();
      return;
    }

    this.rejectPending(0x09, new Error("Login vom PH803W abgelehnt"));
  }

  handlePongResponse() {
    if (this.pingWatchdogTimer) {
      clearTimeout(this.pingWatchdogTimer);
      this.pingWatchdogTimer = null;
    }

    this.schedulePing();
  }

  parseMeasurement(flags1, flags2, payload) {
    const ph = payload.readUInt16BE(0) / 100;
    const redox = payload.readUInt16BE(2) - 2000;

    return {
      ph,
      redox,
      phSwitch: ((flags2 >> 0) & 1) === 1,
      redoxSwitch: ((flags2 >> 1) & 1) === 1,
      raw: {
        flags1,
        flags2,
        flags1Binary: flags1.toString(2),
        flags2Binary: flags2.toString(2)
      },
      timestamp: new Date().toISOString()
    };
  }

  handleMeasurementResponse(data) {
    const measurement = this.parseMeasurement(
      data[8],
      data[9],
      data.subarray(10, 14)
    );

    this.emit("data", measurement);
    this.resolvePending(0x91, measurement);
  }

  handleExtendedMeasurementResponse(data) {
    const measurement = this.parseMeasurement(
      data[12],
      data[13],
      data.subarray(14, 18)
    );

    this.emit("data", measurement);
    this.resolvePending(0x94, measurement);
  }
}

module.exports = { Ph803wDevice };
