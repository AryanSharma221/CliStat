# 🌍 Climate-Adaptive Smart Thermostat Simulation

A real-time, 3D physics-based simulation of a predictive smart HVAC system. This project demonstrates how AI-driven predictive control (Feed-Forward PID) can significantly outperform standard reactive thermostats (Bang-Bang) in reducing energy consumption, cost, and carbon emissions.

## 🚀 Overview

Built for hackathon judges to transparently see the algorithms at work, this project features a stunning 3D architectural cutaway (dollhouse view) combined with a deep, 5-vector thermodynamic physics engine. It pulls live weather data, calculates sun angles based on time of day, and dynamically updates the indoor temperature and HVAC response.

## ✨ Key Features

* **Dual 3D Interactive Models:** Switch seamlessly between an Office layout and a Household layout, fully rendered in WebGL/Three.js with dynamic lighting and shadows.
* **Live Environmental API:** Integrates with OpenWeatherMap to pull live temperature and cloud-cover data for Chennai, India, establishing a real-world baseline.
* **AI Controller Comparison:** Toggle between our **Vision Predictive** (Feed-Forward PID) algorithm and a **Standard Reactive** (Bang-Bang) algorithm to instantly see the difference in behavior and efficiency.
* **Live Economic & Carbon Tracking:** Tracks energy consumption (kWh), time-of-use cost savings (₹), and carbon footprint reduction (kg CO₂) in real-time.
* **Transparent Algorithm Trace:** A built-in "Formulas" developer panel that exposes the live math, PID outputs, and decision-making process of the AI frame-by-frame.
* **Proportional Q-Vectors:** Breaks down the exact source of heat load dynamically (Solar Gain vs. Occupancy vs. Envelope Leakage vs. Thermal Decay).

## 🧠 The Physics Engine

Instead of arbitrary numbers, this simulation is grounded in real-world physics and standards:

1. **Solar Load ($Q_{solar}$):** Raycasted sun intensity based on time of day, attenuated by live cloud cover, passing through an 8m² window with a 0.4 Solar Heat Gain Coefficient (SHGC).
2. **Occupancy Load ($Q_{occ}$):** Based on the ASHRAE 55 standard of 120W (0.12 kW) of metabolic heat emitted per seated person.
3. **Envelope Load ($Q_{env}$):** Heat transfer through the building walls using an insulation U-value of 0.35 W/(m²·K).
4. **Thermal Decay ($Q_{decay}$):** Simulates the thermal mass of the room, re-radiating 8% of previously absorbed solar energy.

The total heat load is converted to a temperature delta using a standard building heat loss coefficient of `0.5 kW/°C`.

## 🤖 The AI Controllers

* **Feed-Forward PID Controller (Our Solution):** Anticipates heat load changes (like the sun rising or people entering) and pre-compensates *before* the temperature drifts. It dynamically scales HVAC power from 0-100% for maximum efficiency.
* **Bang-Bang Controller (The Baseline):** A standard "dumb" thermostat that waits for the room to get too hot, turns the AC on at 100% capacity, overcools, turns off, and repeats. Highly inefficient.

## 💻 Tech Stack

* **Frontend:** Vanilla JavaScript, HTML5, CSS3
* **3D Visualization:** Three.js
* **Data Sources:** OpenWeatherMap API

## 🛠️ Installation & Running Locally

Because this project uses vanilla JavaScript and standard ES modules, it requires no build steps (no npm, webpack, etc.). 

1. Navigate to the project directory (`Simulation_Final`).
2. Start any local HTTP server. For example, using Python 3:
   ```bash
   python -m http.server 8124
   ```
3. Open your browser and go to: `http://localhost:8124`

## 👥 Team
* **Harnoor Kant** - 3D Visualization, UI Architecture, & Physics Wiring
* **Aryan Sharma** - AI Controllers (PID, MPC, RL) & Data Layer
* **Chinmay Gupta** - Physics Engine Core & Backend Structure
