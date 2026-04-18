![License](https://img.shields.io/badge/license-MIT-brightgreen)
![Docker](https://img.shields.io/badge/Docker-ready-blue?logo=docker)
![Node.js](https://img.shields.io/badge/Node.js-24-green?logo=node.js)
![MQTT](https://img.shields.io/badge/MQTT-enabled-orange)
![Status](https://img.shields.io/badge/status-active-success)
![Version](https://img.shields.io/github/v/release/topa-LE/ph803w2-mqtt-bridge?sort=semver&style=flat-square)
![Build](https://img.shields.io/github/actions/workflow/status/topa-LE/ph803w2-mqtt-bridge/docker-ghcr.yml?branch=main&style=flat-square)
![Stars](https://img.shields.io/github/stars/topa-LE/ph803w2-mqtt-bridge?style=flat-square)
![GHCR](https://img.shields.io/badge/GHCR-image-blue?style=flat-square&logo=github)

# 🚀 PH803W2 MQTT Bridge

Moderne Docker MQTT Bridge für den PH-803W 2-in-1 Digital pH / Redox Controller.  
Direkte TCP-Verbindung, keine Discovery-Probleme, vollständig lokal.

---

## ⚡ Features

- 🔌 Direkte TCP-Verbindung zum PH803W2
- ❌ Keine UDP-Discovery
- 📡 MQTT Publish der Messwerte
- 🟢 Status-Topic für Verfügbarkeit
- 🏠 Optionale Home Assistant MQTT Discovery
- 🐳 Docker-ready
- 🔁 Automatisches Reconnect
- ⚙️ Konfiguration per .env

---

## 📦 Schnellstart

Repository klonen
```bash  
git clone https://github.com/topa-LE/ph803w2-mqtt-bridge.git  
```

Verzeichnis wechseln
```bash  
cd ph803w2-mqtt-bridge  
```
Konfiguration erstellen  
```bash
cp .env.example .env  
```

Konfiguration bearbeiten  
```bash
nano .env  
```

Container bauen  
```bash
docker compose build  
```

Container starten  
```bash
docker compose up -d  
```
Logs anzeigen  
```bash
docker compose logs -f  
```
---

## ⚙️ Konfiguration (.env)
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

## 📊 Beispiel MQTT Payload
```bash
{
  "ph": 7.07,
  "redox": 745,
  "phSwitch": false,
  "redoxSwitch": true,
  "timestamp": "2026-04-16T17:30:00.000Z"
}
```
---

## 🏠 Home Assistant

Aktivieren  
```text
HA_DISCOVERY=true  
```

Automatisch erstellt werden  

- pH Sensor  
- Redox Sensor  
- Schaltstatus  
- Status  

---

## 🐳 Deployment

Empfohlener Pfad  
```text
/opt/docker/compose/ph803w2-mqtt-bridge  
```
---

## 🧪 Troubleshooting

Fehler
```bash  
connect EHOSTUNREACH 192.168.178.163:12416  
```
Bedeutung  

- Gerät ist ausgeschaltet  
- IP-Adresse falsch  
- Netzwerk nicht verbunden  

Test  
```bash
ping 192.168.178.163  
nc -zv 192.168.178.163 12416  
```
---

## 🧠 Projektziel

Saubere, moderne und stabile MQTT Bridge für den PH803W2  

- lokal  
- ohne Cloud  
- ohne Discovery-Probleme  
- für alle nutzbar  

---

## 📜 Lizenz

MIT License
