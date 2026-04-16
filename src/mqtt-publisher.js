const mqtt = require("mqtt");

class MqttPublisher {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.client = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const client = mqtt.connect({
        host: this.config.host,
        port: this.config.port,
        username: this.config.username || undefined,
        password: this.config.password || undefined,
        clientId: this.config.clientId,
        reconnectPeriod: 5000,
        connectTimeout: 10000,
        clean: true
      });

      let settled = false;

      client.on("connect", () => {
        this.client = client;
        this.logger.info(
          `MQTT verbunden: ${this.config.host}:${this.config.port} (${this.config.clientId})`
        );

        if (!settled) {
          settled = true;
          resolve(true);
        }
      });

      client.on("reconnect", () => {
        this.logger.warn("MQTT Reconnect läuft");
      });

      client.on("close", () => {
        this.logger.warn("MQTT Verbindung geschlossen");
      });

      client.on("error", (err) => {
        this.logger.error(`MQTT Fehler: ${err.message}`);

        if (!settled) {
          settled = true;
          reject(err);
        }
      });
    });
  }

  isConnected() {
    return Boolean(this.client?.connected);
  }

  async publishAbsolute(topic, payload, options = {}) {
    if (!this.isConnected()) {
      throw new Error("MQTT ist nicht verbunden");
    }

    const publishOptions = {
      qos: options.qos ?? 1,
      retain: options.retain ?? true
    };

    const body =
      typeof payload === "string" ? payload : JSON.stringify(payload);

    return new Promise((resolve, reject) => {
      this.client.publish(topic, body, publishOptions, (err) => {
        if (err) {
          return reject(err);
        }

        resolve(true);
      });
    });
  }

  async publish(topicSuffix, payload, options = {}) {
    const topic = topicSuffix
      ? `${this.config.topic}/${topicSuffix}`
      : this.config.topic;

    return this.publishAbsolute(topic, payload, options);
  }

  async publishMeasurement(measurement) {
    await this.publish("", measurement, { qos: 1, retain: true });
    await this.publish("ph", String(measurement.ph), { qos: 1, retain: true });
    await this.publish("redox", String(measurement.redox), {
      qos: 1,
      retain: true
    });
    await this.publish("switch/ph", measurement.phSwitch ? "ON" : "OFF", {
      qos: 1,
      retain: true
    });
    await this.publish(
      "switch/redox",
      measurement.redoxSwitch ? "ON" : "OFF",
      {
        qos: 1,
        retain: true
      }
    );
    await this.publish("raw", measurement.raw, { qos: 1, retain: false });
  }

  async publishStatus(status) {
    await this.publish("status", status, { qos: 1, retain: true });
  }

  async disconnect() {
    if (!this.client) {
      return true;
    }

    return new Promise((resolve) => {
      this.client.end(true, {}, () => {
        resolve(true);
      });
    });
  }
}

module.exports = { MqttPublisher };
