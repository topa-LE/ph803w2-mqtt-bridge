const { config } = require("./config");
const { Ph803wDevice } = require("./ph803w-device");
const { MqttPublisher } = require("./mqtt-publisher");
const { publishHomeAssistantDiscovery } = require("./homeassistant");

function createLogger(level) {
  const allowed = ["error", "warn", "info", "debug"];
  const currentIndex = allowed.indexOf(level);

  function log(targetLevel, message, meta = null) {
    const targetIndex = allowed.indexOf(targetLevel);
    if (targetIndex > currentIndex) {
      return;
    }

    const ts = new Date().toISOString();

    if (meta !== null) {
      console.log(`[${ts}] [${targetLevel.toUpperCase()}] ${message}`, meta);
      return;
    }

    console.log(`[${ts}] [${targetLevel.toUpperCase()}] ${message}`);
  }

  return {
    error: (message, meta = null) => log("error", message, meta),
    warn: (message, meta = null) => log("warn", message, meta),
    info: (message, meta = null) => log("info", message, meta),
    debug: (message, meta = null) => log("debug", message, meta)
  };
}

const logger = createLogger(config.system.logLevel);
const mqttPublisher = new MqttPublisher(config.mqtt, logger);

let device = null;
let pollTimer = null;
let reconnectTimer = null;
let shuttingDown = false;

function clearTimers() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

async function destroyDevice() {
  if (!device) {
    return;
  }

  try {
    await device.disconnect();
  } catch (_) {
    // ignore
  }

  device.removeAllListeners();
  device = null;
}

function scheduleReconnect() {
  if (shuttingDown || reconnectTimer) {
    return;
  }

  logger.warn(
    `Neuer Verbindungsversuch in ${config.system.reconnectDelayMs} ms`
  );

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;

    try {
      await startDeviceLoop();
    } catch (err) {
      logger.error(`Reconnect fehlgeschlagen: ${err.message}`);
      scheduleReconnect();
    }
  }, config.system.reconnectDelayMs);
}

async function publishAvailability(status) {
  try {
    await mqttPublisher.publishStatus(status);
  } catch (err) {
    logger.error(`Status Publish fehlgeschlagen: ${err.message}`);
  }
}

async function pollOnce() {
  if (!device) {
    throw new Error("Gerät nicht initialisiert");
  }

  const measurement = await device.retrieveData();
  logger.info(`Messwert empfangen: pH=${measurement.ph} Redox=${measurement.redox}`);

  await mqttPublisher.publishMeasurement(measurement);
}

async function startDeviceLoop() {
  clearTimers();
  await destroyDevice();

  logger.info(
    `Verbinde PH803W2 direkt per TCP: ${config.ph803w.ip}:${config.ph803w.port}`
  );

  device = new Ph803wDevice({
    ip: config.ph803w.ip,
    port: config.ph803w.port,
    responseTimeoutMs: config.system.socketTimeoutMs
  });

  device.on("connected", () => {
    logger.info("PH803W2 TCP verbunden");
  });

  device.on("data", (data) => {
    logger.debug("PH803W2 Daten-Event", data);
  });

  device.on("disconnected", async () => {
    logger.warn("PH803W2 Verbindung getrennt");
    await publishAvailability("degraded");
    scheduleReconnect();
  });

  device.on("error", (err) => {
    logger.error(`PH803W2 Fehler: ${err.message}`);
  });

  await device.connect();
  await device.login();
  logger.info("PH803W2 Login erfolgreich");

  const firstMeasurement = await device.retrieveData();
  logger.info(
    `Erste Messung erfolgreich: pH=${firstMeasurement.ph} Redox=${firstMeasurement.redox}`
  );

  await mqttPublisher.publishMeasurement(firstMeasurement);
  await publishAvailability("online");

  if (config.homeAssistant.discoveryEnabled) {
    await publishHomeAssistantDiscovery(config, mqttPublisher, logger);
  }

  pollTimer = setInterval(async () => {
    try {
      await pollOnce();
      await publishAvailability("online");
    } catch (err) {
      logger.error(`Polling fehlgeschlagen: ${err.message}`);
      await publishAvailability("degraded");
      scheduleReconnect();
    }
  }, config.system.pollIntervalSeconds * 1000);
}

async function startup() {
  logger.info("Starte ph803w2-mqtt-bridge");

  await mqttPublisher.connect();
  await publishAvailability("starting");

  await startDeviceLoop();
}

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  logger.warn(`Shutdown empfangen: ${signal}`);

  clearTimers();

  try {
    await publishAvailability("offline");
  } catch (_) {
    // ignore
  }

  await destroyDevice();
  await mqttPublisher.disconnect();

  process.exit(0);
}

process.on("SIGINT", () => {
  shutdown("SIGINT").catch((err) => {
    logger.error(`Shutdown Fehler: ${err.message}`);
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM").catch((err) => {
    logger.error(`Shutdown Fehler: ${err.message}`);
    process.exit(1);
  });
});

startup().catch(async (err) => {
  logger.error(`Fataler Startfehler: ${err.message}`);

  try {
    await publishAvailability("error");
  } catch (_) {
    // ignore
  }

  scheduleReconnect();
});
