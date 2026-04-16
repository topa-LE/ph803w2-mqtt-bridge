require("dotenv").config();

function parseNumber(name, defaultValue) {
  const raw = process.env[name];

  if (raw === undefined || raw === null || raw === "") {
    return defaultValue;
  }

  const value = Number(raw);

  if (!Number.isFinite(value)) {
    throw new Error(`Ungültige Zahl in Umgebungsvariable ${name}: ${raw}`);
  }

  return value;
}

function parseBoolean(name, defaultValue) {
  const raw = process.env[name];

  if (raw === undefined || raw === null || raw === "") {
    return defaultValue;
  }

  const normalized = String(raw).trim().toLowerCase();

  if (["1", "true", "yes", "ja", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "nein", "off"].includes(normalized)) {
    return false;
  }

  throw new Error(`Ungültiger Boolean in Umgebungsvariable ${name}: ${raw}`);
}

function required(name) {
  const value = process.env[name];

  if (!value || value.trim() === "") {
    throw new Error(`Pflichtvariable fehlt: ${name}`);
  }

  return value.trim();
}

function optional(name, fallback = "") {
  const value = process.env[name];

  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return String(value).trim();
}

function sanitizeForId(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function sanitizeForClientId(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const ph803wIp = required("PH803W_IP");
const mqttTopic = required("MQTT_TOPIC");

const defaultDeviceId = sanitizeForId(`ph803w2_${ph803wIp}`);
const defaultDeviceName = `PH803W2 (${ph803wIp})`;
const defaultClientId = "ph803w2-mqtt-bridge";

const config = {
  ph803w: {
    ip: ph803wIp,
    port: parseNumber("PH803W_PORT", 12416)
  },

  mqtt: {
    host: required("MQTT_HOST"),
    port: parseNumber("MQTT_PORT", 1883),
    username: optional("MQTT_USERNAME", ""),
    password: optional("MQTT_PASSWORD", ""),
    topic: mqttTopic,
    clientId: sanitizeForClientId(optional("MQTT_CLIENT_ID", defaultClientId))
  },

  system: {
    pollIntervalSeconds: parseNumber("POLL_INTERVAL_SECONDS", 60),
    socketTimeoutMs: parseNumber("SOCKET_TIMEOUT_MS", 8000),
    reconnectDelayMs: parseNumber("RECONNECT_DELAY_MS", 10000),
    logLevel: optional("LOG_LEVEL", "info").toLowerCase()
  },

  homeAssistant: {
    discoveryEnabled: parseBoolean("HA_DISCOVERY", true),
    discoveryPrefix: optional("HA_DISCOVERY_PREFIX", "homeassistant"),
    deviceName: optional("HA_DEVICE_NAME", defaultDeviceName),
    deviceId: sanitizeForId(optional("HA_DEVICE_ID", defaultDeviceId))
  }
};

const allowedLogLevels = ["error", "warn", "info", "debug"];

if (!allowedLogLevels.includes(config.system.logLevel)) {
  throw new Error(
    `Ungültiger LOG_LEVEL: ${config.system.logLevel}. Erlaubt: ${allowedLogLevels.join(", ")}`
  );
}

if (config.system.pollIntervalSeconds < 5) {
  throw new Error("POLL_INTERVAL_SECONDS muss mindestens 5 sein");
}

if (config.ph803w.port < 1 || config.ph803w.port > 65535) {
  throw new Error("PH803W_PORT ist ungültig");
}

if (config.mqtt.port < 1 || config.mqtt.port > 65535) {
  throw new Error("MQTT_PORT ist ungültig");
}

module.exports = { config };
