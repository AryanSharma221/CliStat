# CliStat

A full-stack, cyber-physical smart thermostat ecosystem designed to completely rethink building HVAC management. Instead of relying on legacy "react-to-drop" mechanicsGÇöwhere a system only cools a room *after* the physical environment has already become uncomfortably hotGÇöthis platform utilizes Machine Learning, real-time weather APIs, and zero-hardware occupancy tracking to proactively calculate thermal load. By mathematically determining the room's energy shift before it happens, the system maintains perfect thermal comfort while aggressively minimizing energy consumption.

---

## =ƒÅùn+Å System Architecture & Deep Technical Segregation

The platform is engineered as a highly decoupled, modern microservice architecture. It is strictly segregated into four distinct technological domains: **Frontend Tech**, **Backend Tech**, **The Simulation Engine**, and **The RL Model (Predictive Engine)**.

---

### 1. Frontend Tech (The Interface Layer)
The user-facing dashboard acts as the command center for the digital twin, translating complex, high-velocity thermodynamic data into intuitive visualizations without dropping frames or causing browser lag.

- **Technology Stack:** React.js, Vite, Tailwind CSS, Recharts.
- **Cinematic & Component-Driven UI:** The application (anchored in `App.tsx`) launches with a highly polished hero section featuring autoplaying video backgrounds and frosted glass interfaces. By leveraging Tailwind CSS, the application maintains a tiny stylesheet footprint while providing complex staggered transitions, typography scaling, and utility-first responsiveness.
- **High-Velocity Data Binding:** Traditional HTTP polling is far too slow for real-time sensor feedback. The React application establishes a persistent WebSocket connection to the backend. As the Simulation Engine pumps out mocked IoT data every 800 milliseconds, the frontend dynamically updates its React state.
- **Visual Analytics & Performance:** Using the Recharts library, the dashboard draws live, animated line charts. It overlays the "Predictive Baseline" (how our smart thermostat behaves) against a "Dumb Thermostat Baseline." To ensure the browser doesn't freeze under the weight of thousands of data points, the frontend relies on optimized state management and array-windowing techniques to only render the most relevant time slices.

---

### 2. Backend Tech (The Integration Layer)
The API routing layer acts as the traffic controller, bridging the frontend interface with the predictive machine learning models, third-party APIs, and the local file system.

- **Technology Stack:** Node.js, Express.
- **Secure Weather API Proxy:** Instead of the frontend directly querying external services (which would expose API keys to the client), the Express backend securely proxies requests to the OpenWeatherMap API (`routes/weather.js`). It implements a strict 5-minute in-memory caching mechanism. This not only prevents aggressive rate-limiting from the free-tier API but also ensures the simulation runs smoothly even if the external network request momentarily fails.
- **File-System Session Management:** The backend features a lightweight, synchronous JSON-based database (`services/db.js`) to record complex simulation states. It handles full CRUD operations, assigning unique session IDs to every run. As the simulation plays out, data frames are appended to the session array in real-time. This allows users to save specific simulation runs and later trigger a backend route that compiles the JSON arrays into downloadable CSV files for external data analysis.
- **CORS & Seamless Integration:** The Express server acts as the central communication hub, configuring CORS policies and translating RESTful requests from the frontend, then securely passing required environmental variables (like requested thermal setpoints) to the separate Python ML server.

---

### 3. The Simulation Engine (The Digital Twin)
The heart of the cyber-physical environment. Because testing HVAC algorithms on physical buildings takes months, this module calculates the exact physical heat loads acting on a room in real-time, creating a mathematically perfect playground for AI to operate within.

- **Technology Stack:** Socket.IO, Custom JavaScript Physics Engine (`services/iotSimulator.js` & `ui.js`).
- **IoT Hardware Mocking:** To emulate real-world hardware constraints, the engine simulates an array of 5 I2C temperature sensors communicating at 800ms intervals. To ensure the ML model doesn't overfit to perfect data, Box-Muller transforms are utilized to inject natural Gaussian noise (-¦0.4-¦F standard deviation) and spatial bias into the temperature readings.
- **Proactive Thermodynamics (The 'Q' Vectors):** The simulation calculates exact thermodynamic vectors to simulate the room environment before feeding it to the controller. Standard thermostats fail because they don't know *why* a room is getting hot. Our engine calculates:
  - **$Q_{Solar}$ (Solar Heat Gain):** Calculated as `SunIntensity +ù WindowArea +ù SHGC +ù SolarIrradiance`. Instead of static numbers, it uses real-time cloud cover and solar positioning to dynamically compute how much solar radiation is actively passing through the 8m-¦ windows (assuming a Solar Heat Gain Coefficient of 0.4).
  - **$Q_{Occupancy}$ (Body Heat):** Calculated as `Occupancy +ù 0.12 kW`. This is strictly based on the ASHRAE 55 standard, which dictates that an average office worker emits approximately 120 Watts of metabolic heat.
  - **$Q_{Envelope}$ (Wall Leakage):** Calculated as `(U_envelope +ù A_envelope +ù DeltaT) / 1000`. Using a standard U-value of 0.35 W/m-¦K, it calculates the thermal bleed through the building's exterior walls based on the difference between indoor and outdoor temperatures.
  - **$Q_{Decay}$ (Thermal Mass):** Calculated as `Q_Solar +ù 0.08`. It accounts for the 8% of solar energy that is absorbed by physical objects (desks, floors) and slowly re-radiates over time.
- **The Predictive Delta:** By summing these vectors ($Q_{Total} = Q_{Solar} + Q_{Occupancy} + Q_{Envelope} + Q_{Decay}$), the engine divides the total kW load by the building's heat loss coefficient. This tells the system exactly how hot the room *will* get, a full 15 minutes before the physical sensors register the spike, allowing the HVAC to ramp up preemptively.

---

### 4. The RL Model (The Predictive Engine)
While the overarching architecture is designed as a simulated environment to eventually host a true Reinforcement Learning agent (like Proximal Policy Optimization or a Deep Q-Network), the current deployed system utilizes a highly optimized supervised learning model acting as the "Environment Dynamics Predictor."

- **Technology Stack:** Python 3, FastAPI, XGBoost, Pandas, Scikit-Learn.
- **The Algorithm:** At the core sits an XGBoost Regressor (`max_depth=6`, `n_estimators=100`, objective function: `reg:squarederror`). XGBoost was explicitly chosen over Deep Learning because gradient-boosted decision trees drastically outperform neural networks on structured, tabular, time-series data. It forecasts the exact HVAC power demand (in continuous Watts) needed at any given 15-minute interval.
- **The Synthetic Dataset Generation:** Because real-world smart thermostat logs are highly proprietary, the system relies on a heavily engineered synthetic time-series dataset generated by `train.py`. It comprises 35,000 rows (simulating 1 year of continuous HVAC operations). The generator uses sine and cosine waves to simulate realistic seasonal shifts and diurnal (daily) temperature patterns, while injecting random variance to simulate unpredictable weather events.
- **Advanced Feature Engineering:** Machine learning models struggle with cyclic time (e.g., understanding that December 31st is fundamentally close to January 1st). To solve this, time variables are converted into cyclical mathematical features (`hour_sin`, `hour_cos`, `month_sin`, `month_cos`). Furthermore, building properties like room direction are One-Hot Encoded to allow the model to learn that West-facing rooms require more cooling in the late afternoon.
- **Zero-Hardware Occupancy Tracking (The Smart Hack):** The most innovative feature of the predictive engine is how it acquires occupancy data. Instead of relying on expensive, privacy-invasive IR sensors or cameras, the FastAPI backend (`app.py`) queries the host machine's network state to find human occupancy dynamically:
  1. It runs a subprocess `ipconfig /all` and uses regex to locate the exact IPv4 address of the local "Windows Mobile Hotspot" Virtual Adapter.
  2. It then executes the `arp -a` command to parse the ARP routing table specific to that IP block.
  3. By programmatically ignoring broadcast addresses (`.255`) and multicast IPs (`224.x.x.x`), it securely **counts the exact number of connected mobile devices** on the subnet.
  4. Operating under the reasonable assumption that `1 mobile device = 1 human`, this data feeds real-time metabolic heat loads ($Q_{Occupancy}$) directly into the XGBoost model, completely eliminating the need for extra IoT hardware.
