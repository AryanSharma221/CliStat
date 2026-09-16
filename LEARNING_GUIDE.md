# Climate-Adaptive Smart Thermostat: Technical Learning Guide

This document is a comprehensive guide to understanding every moving part of the project. It is designed to prepare you for a hackathon pitch, explain the deep technical formulas, and help you confidently answer cross-examination questions from judges.

---

## 1. Overall Tech Stack

The project is built as a complete **Cyber-Physical System (CPS)** with three main layers:
1. **Frontend (The Interface):** React.js, Vite, Tailwind CSS, Recharts (for live graphing). UI Mockups were likely designed in Figma (evidenced by the `.figma` config).
2. **Backend/Simulation (The Digital Twin):** Node.js, Express, Socket.IO.
3. **Machine Learning / Predictive Engine:** Python, FastAPI, XGBoost, Pandas, Scikit-Learn. 

---

## 2. Intro to Reinforcement Learning vs. Our Approach

### What is Reinforcement Learning (RL)?
RL is an area of Machine Learning where an **Agent** learns to make decisions by performing **Actions** in an **Environment** to maximize a cumulative **Reward**. For a thermostat, the RL agent would learn to turn the AC on/off (Action) based on the room temperature (State) to maximize comfort while minimizing electricity cost (Reward).

### Our Project's Model (The "Gotcha" to watch out for)
*Note for the pitch:* Although our backend folder is named `rl-backend`, the core algorithm we currently have deployed is **XGBoost (Extreme Gradient Boosting)**, which is a **Supervised Learning** algorithm, not RL. 
* **How to explain this to judges:** "We built our digital twin environment and physics simulator as the foundation for an RL agent. Currently, we use an XGBoost Regressor as an *Environment Dynamics Predictor* to forecast the exact HVAC power demand (in Watts) needed at any given 15-minute interval. This predictive baseline is step 1; the next iteration drops a Deep Q-Network (DQN) or PPO agent into this environment to control it."

---

## 3. The Algorithm: XGBoost & The Dataset

### How the Algorithm Works
We use an **XGBoost Regressor** (`max_depth=6`, `n_estimators=100`). It builds a series of decision trees sequentially, where each new tree tries to correct the errors of the previous ones. It is highly optimized for tabular time-series data. 

### The Dataset
Since we don't have years of real smart-thermostat data, we generate a highly realistic **synthetic dataset** (`train.py`) consisting of 35,000 rows (about 1 year of data at 15-minute intervals).

**Features Engineered:**
We convert time into cyclical mathematical features (`hour_sin`, `hour_cos`, `month_sin`) so the ML model understands that 11:59 PM is right next to 12:01 AM. We also One-Hot encode the room direction (`dir_North`, `dir_South`, etc.).

**Head of Dataset (What it looks like):**
| time | outside_temperature | required_temperature | humidity | solar_radiation | room_area | occupancy | hvac_power (Target) |
|---|---|---|---|---|---|---|---|
| 2023-01-01 08:00:00 | 22.4°C | 24.0°C | 60% | 210 W/m² | 45m² | 3 | 1240 W |
| 2023-01-01 08:15:00 | 22.8°C | 24.0°C | 58% | 245 W/m² | 45m² | 3 | 1310 W |
| ... | ... | ... | ... | ... | ... | ... | ... |

---

## 4. WiFi Occupancy Tracking (The "Smart Hack")

Traditional smart thermostats require expensive IR sensors or cameras to know how many people are in a room. We built a software-only solution in `app.py`:
1. The FastAPI server runs `ipconfig /all` to find the IP address of the local **Windows Mobile Hotspot**.
2. It then runs the `arp -a` command to read the router's ARP (Address Resolution Protocol) table.
3. By filtering out broadcast IPs, it **counts the exact number of connected mobile devices**.
4. We equate 1 device = 1 human. This feeds real-time occupancy data directly into the ML model without any extra hardware!

---

## 5. Weather API Integration

We use the **OpenWeatherMap API**.
- **Input:** We send the City (e.g., Chennai) or `lat/lon` coordinates along with our API Key.
- **Output:** The API returns a JSON payload containing `temp`, `humidity`, `clouds` (%), `wind_speed`, and `sunrise/sunset` UNIX timestamps.
- **How we use it:** Our Node.js server proxies this API to prevent rate-limiting and caches it for 5 minutes. The Python backend looks at the cloud cover and the current time relative to sunrise/sunset to dynamically calculate the `solar_radiation` hitting the building.

---

## 6. The Digital Twin Simulation & Thermodynamics (The Physics Formulas)

This is the most impressive technical part of the server (`server/services/iotSimulator.js` and `ui.js`). Instead of just guessing, the server calculates exact thermodynamic heat loads (Q vectors) to predict temperature changes *before* they happen.

Here are the formulas we coded into the simulator:

**1. Q_Solar (Heat from the Sun)**
```javascript
qSolarKw = SunIntensity * WindowArea * SHGC * SolarIrradiance / 1000;
```
*We assume an 8m² window and a standard SHGC (Solar Heat Gain Coefficient) of 0.4. If the sun is hitting the window, this calculates the raw kilowatt heat added.*

**2. Q_Occupancy (Human Body Heat)**
```javascript
qOccupancyKw = Occupancy * 0.12;
```
*We strictly follow the **ASHRAE 55 standard**, which states an average office worker emits ~120 Watts (0.12 kW) of metabolic heat.*

**3. Q_Envelope (Heat leaking through walls)**
```javascript
qEnvelopeKw = (U_envelope * A_envelope * DeltaT) / 1000;
```
*Uses standard building physics. `U_envelope` (0.35) is the insulation quality, `A` (45m²) is the wall area, and `DeltaT` is the difference between indoor and outdoor temps.*

**4. Q_Decay (Thermal Mass / Furniture Heat)**
```javascript
qDecayKw = Q_Solar * 0.08;
```
*Objects in a room absorb sunlight and slowly re-radiate it. We estimate 8% of solar heat becomes thermal decay load.*

**Total Predicted Heat Load:**
```javascript
TotalHeatLoadKw = Q_Solar + Q_Occupancy + Q_Envelope + Q_Decay;
```

**Why this matters:** A standard thermostat waits for the room to get hot before turning on. Because we calculate `TotalHeatLoadKw` in real-time, our thermostat **knows the room is going to get hot 15 minutes before it actually does**, allowing the XGBoost model to preemptively ramp up the HVAC power to maintain a perfect flatline temperature!

---

## 7. Frontend Dashboard (UI/UX)

- **Tools used:** React (Component architecture), Vite (Fast bundling), Tailwind CSS (Utility-first styling).
- **How it works:** 
  1. The UI connects to the Node.js backend via **Socket.IO** (WebSockets).
  2. The Node backend simulates an IoT sensor emitting data every 800ms.
  3. The React app ingests this WebSocket stream and pushes it into state variables.
  4. Libraries like `recharts` draw the animated graphs comparing the "Predictive Baseline" vs. the "Dumb Thermostat Baseline" to visually prove our energy savings and comfort stability to the judges.
