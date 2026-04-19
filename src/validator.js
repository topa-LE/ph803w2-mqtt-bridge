// ==========================================
// CONFIG VALIDATOR
// ==========================================

function validateEnv() {
  console.log("🔍 Validating environment configuration...");

  const requiredVars = [
    "PH803W_IP",
    "MQTT_HOST",
    "MQTT_TOPIC"
  ];

  let hasError = false;

  requiredVars.forEach((key) => {
    if (!process.env[key] || process.env[key].trim() === "") {
      console.error(`❌ Missing required environment variable: ${key}`);
      hasError = true;
    }
  });

  if (hasError) {
    console.error("❌ Configuration invalid. Exiting...");
    process.exit(1);
  }

  // Optional checks
  const port = process.env.MQTT_PORT || 1883;
  if (isNaN(port)) {
    console.error("❌ MQTT_PORT must be a number");
    process.exit(1);
  }

  const interval = process.env.POLL_INTERVAL_SECONDS || 900;
  if (isNaN(interval)) {
    console.error("❌ POLL_INTERVAL_SECONDS must be a number");
    process.exit(1);
  }

  console.log("✅ Environment configuration valid");
}

module.exports = { validateEnv };
