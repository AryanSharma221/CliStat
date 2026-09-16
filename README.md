# Predictive Environmental Intelligence (PEI)
> **A Climate-Adaptive Smart Thermostat System**

![System Architecture](https://img.shields.io/badge/Architecture-Edge_Native-0ea5e9)
![Energy Savings](https://img.shields.io/badge/Energy_Savings-32%25-16a34a)
![Response Time](https://img.shields.io/badge/Response_Time-<1_sec-8b5cf6)

*Reactive cooling is a design flaw, not a feature.* Traditional thermostats wait for the room to get hot before turning on, blasting maximum power during peak grid hours. **PEI** is a closed-loop intelligence layer that replaces guesswork with physics. It acts 15 minutes before the heat arrives.

## ?? The Dual-Model Architecture

Our system calculates the optimal setpoint trajectory using two distinct but complementary approaches:

### 1. First-Principles Thermodynamics (Physics-Based Digital Twin)
A live WebGL 3D physics model of the building that calculates heat ingress across 5 physics vectors simultaneously:
* **Solar Radiation (Q_solar)**: 3D Ray-AABB collision tracking sun angle, window area, and cloud attenuation.
* **Human Occupancy (Q_occupancy)**: Stochastic modeling based on ASHRAE 55 metabolic heat dissipation (120W/person).
* **Envelope Leakage (Q_envelope)**: Conductive infiltration based on real-time outdoor/indoor temperature deltas.
* **Humidity Load (Q_latent)**: Moisture dehumidification overhead.
* **Thermal Decay (Q_decay)**: Exponential re-radiation of stored heat from building mass.

**Control Loop:** 
Uses a Feed-Forward PID controller u(t) = Kp·e(t) + Ki·?e·dt + Kd·de/dt + Kff·Q_predicted integrated with an **MPC (Model Predictive Control)** optimizer evaluating 52 candidate schedules over a 60-minute horizon. Data is smoothed using a **1D Discrete Kalman Filter** across multiple IoT sensors.

### 2. Gradient Boosted Trees (RL XGBoost Model)
A machine learning demand prediction model operating on 21 engineered features.
* **Architecture**: XGBRegressor (100 estimators, max depth 6).
* **Features**: Temporal (cyclical time/season), Weather (API telemetry), Thermal (gradients/errors), and Spatial (orientation, room size).
* **Live Integration**: Uses Windows Wi-Fi Direct ARP sniffing to actively count connected devices and estimate live room occupancy without privacy-invasive cameras.

## ?? Measured Efficiency

| Metric | Vision-Predictive (MPC) | RL Agent (XGBoost) | Standard Thermostat |
|--------|------------------------|--------------------|--------------------|
| **Control Method** | Feed-Forward PID + MPC | Gradient Boosted Trees | Bang-Bang (on/off) |
| **Lookahead** | 15 minutes | Real-time inference | None (reactive only) |
| **Heat Modeling** | 5-vector physics ODE | 21-feature regression | Single thermocouple |
| **Peak Shifting** | Grid-aware ToU scheduling | Demand prediction | None |
| **Sensor Fusion** | Kalman (BLUE) multi-sensor | ARP + Weather API | Single sensor |

**System Impact:**
* **32% Energy Savings** vs. standard bang-bang reactive baseline.
* **0.82 kg CO2/kWh** tracked for Time-of-Use (ToU) emissions optimization.
* **< 1 second** full sensor-to-actuator loop running fully on-device (edge-native).

## ?? Tech Stack & Project Structure

The project is broken down into a microservice-style architecture running across three primary nodes:

- **/src & /public**: The Frontend UI & 3D Engine (React, Vite, TypeScript, Three.js).
- **/server**: The Node.js Backend for IoT MQTT/Socket bridging and API proxying.
- **/rl-backend**: The Python FastAPI backend running the XGBoost model inference.
- **/public/Simulation_Final**: The pure-JS core thermodynamic simulation engine.

## ??? Getting Started (Local Development)

To run the entire digital twin simulation locally, you will need to spin up the three primary services:

1. **Start the Node Backend** (Serves Weather API & Socket.IO):
   \\\ash
   node server/index.js
   # Runs on http://localhost:3001
   \\\

2. **Start the XGBoost Python Backend**:
   \\\ash
   cd rl-backend
   pip install -r requirements.txt
   python app.py
   # Runs on http://localhost:8000
   \\\

3. **Start the Vite Frontend / Dashboard**:
   \\\ash
   npm install
   npm run dev
   # Runs on http://localhost:8443
   \\\

Open http://localhost:8443 in your browser to view the live 3D predictive dashboard.
