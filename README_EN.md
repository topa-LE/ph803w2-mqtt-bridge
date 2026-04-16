![Docker](https://img.shields.io/badge/Docker-ready-blue?logo=docker)
![Node.js](https://img.shields.io/badge/Node.js-24-green?logo=node.js)
![MQTT](https://img.shields.io/badge/MQTT-enabled-orange)
![License](https://img.shields.io/badge/license-MIT-brightgreen)
![Status](https://img.shields.io/badge/status-active-success)


# 🚀 PH803W2 MQTT Bridge

Modern Docker MQTT bridge for the PH-803W 2-in-1 Digital pH / Redox Controller.

---

## ⚡ Features

- 🔌 Direct TCP connection to PH803W2
- ❌ No UDP discovery
- 📡 MQTT publishing
- 🟢 Status topic
- 🏠 Optional Home Assistant Discovery
- 🐳 Docker-ready
- 🔁 Auto reconnect
- ⚙️ Configuration via .env

---

## 📦 Quick Start

Clone repository  
```bash
git clone https://github.com/topa-LE/ph803w2-mqtt-bridge.git  
```

Change directory  
```bash
cd ph803w2-mqtt-bridge  
```
Create config  
```bash
cp .env.example .env  
```
Edit config  
```bash
nano .env  
```
Build container  
```bash
docker compose build  
```
Start container  
```bash
docker compose up -d  
```
View logs  
```bash
docker compose logs -f  
```
---

## ⚙️ Configuration

```text
PH803W_IP=192.168.178.163  
PH803W_PORT=12416  

MQTT_HOST=192.168.178.10  
MQTT_PORT=1883  
MQTT_USERNAME=  
MQTT_PASSWORD=  
MQTT_TOPIC=pool/ph803w2  
MQTT_CLIENT_ID=ph803w2-mqtt-bridge  

POLL_INTERVAL_SECONDS=60  
LOG_LEVEL=info  
SOCKET_TIMEOUT_MS=8000  
RECONNECT_DELAY_MS=10000  

HA_DISCOVERY=true  
HA_DISCOVERY_PREFIX=homeassistant  
HA_DEVICE_NAME=PH803W2 Controller  
HA_DEVICE_ID=ph803w2_controller  
```

---

## 📡 MQTT Topics

- pool/ph803w2  
- pool/ph803w2/ph  
- pool/ph803w2/redox  
- pool/ph803w2/switch/ph  
- pool/ph803w2/switch/redox  
- pool/ph803w2/raw  
- pool/ph803w2/status  

---

## 🏠 Home Assistant

Enable  
```text
HA_DISCOVERY=true  
```

---

## 🐳 Deployment

Recommended path  
```text
/opt/docker/compose/ph803w2-mqtt-bridge  
```

---

## 🧪 Troubleshooting

Error  
```text
connect EHOSTUNREACH 192.168.178.163:12416  
```
Check (Example for IP PH803W2 Controller)  

```bash
ping 192.168.178.163  
nc -zv 192.168.178.163 12416  
```

---

## 📜 License

MIT License
