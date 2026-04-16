function buildDeviceMetadata(config) {
  return {
    identifiers: [config.homeAssistant.deviceId],
    name: config.homeAssistant.deviceName,
    manufacturer: "PH803W2",
    model: "PH-803W 2-in-1 Digital pH Redox Controller",
    sw_version: "1.0.0"
  };
}

function buildDiscoveryTopic(prefix, component, objectId) {
  return `${prefix}/${component}/${objectId}/config`;
}

async function publishHomeAssistantDiscovery(config, mqttPublisher, logger) {
  if (!config.homeAssistant.discoveryEnabled) {
    logger.info("Home Assistant Discovery deaktiviert");
    return;
  }

  const prefix = config.homeAssistant.discoveryPrefix;
  const deviceId = config.homeAssistant.deviceId;
  const device = buildDeviceMetadata(config);
  const baseStateTopic = config.mqtt.topic;

  const entities = [
    {
      component: "sensor",
      objectId: `${deviceId}_ph`,
      payload: {
        name: "PH803W2 pH",
        unique_id: `${deviceId}_ph`,
        state_topic: `${baseStateTopic}/ph`,
        icon: "mdi:ph",
        state_class: "measurement",
        unit_of_measurement: "pH",
        value_template: "{{ value }}",
        device
      }
    },
    {
      component: "sensor",
      objectId: `${deviceId}_redox`,
      payload: {
        name: "PH803W2 Redox",
        unique_id: `${deviceId}_redox`,
        state_topic: `${baseStateTopic}/redox`,
        icon: "mdi:flash",
        state_class: "measurement",
        unit_of_measurement: "mV",
        value_template: "{{ value }}",
        device
      }
    },
    {
      component: "binary_sensor",
      objectId: `${deviceId}_ph_switch`,
      payload: {
        name: "PH803W2 pH Switch",
        unique_id: `${deviceId}_ph_switch`,
        state_topic: `${baseStateTopic}/switch/ph`,
        payload_on: "ON",
        payload_off: "OFF",
        icon: "mdi:toggle-switch",
        device
      }
    },
    {
      component: "binary_sensor",
      objectId: `${deviceId}_redox_switch`,
      payload: {
        name: "PH803W2 Redox Switch",
        unique_id: `${deviceId}_redox_switch`,
        state_topic: `${baseStateTopic}/switch/redox`,
        payload_on: "ON",
        payload_off: "OFF",
        icon: "mdi:toggle-switch",
        device
      }
    },
    {
      component: "sensor",
      objectId: `${deviceId}_status`,
      payload: {
        name: "PH803W2 Status",
        unique_id: `${deviceId}_status`,
        state_topic: `${baseStateTopic}/status`,
        icon: "mdi:information",
        value_template: "{{ value }}",
        device
      }
    }
  ];

  for (const entity of entities) {
    const topic = buildDiscoveryTopic(
      prefix,
      entity.component,
      entity.objectId
    );

    await mqttPublisher.publishAbsolute(topic, entity.payload, {
      qos: 1,
      retain: true
    });
  }

  logger.info("Home Assistant Discovery veröffentlicht");
}

module.exports = { publishHomeAssistantDiscovery };
