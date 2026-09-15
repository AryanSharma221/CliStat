# Climate-Adaptive Smart Thermostat: Technical Architecture & System Design Document
## The Vision-Predictive Digital Twin — Full Vision (v2.0)

---

## 1. Executive Summary & Project Mechanics

The **Climate-Adaptive Smart Thermostat** is a browser-native, real-time physics simulation that fundamentally rethinks how HVAC systems respond to heat. Instead of reacting to temperature changes *after* they occur (the industry-standard "Bang-Bang" controller), our system deploys a **Vision-Predictive Digital Twin** that continuously monitors the *causes* of heat and neutralizes them before the ambient room temperature ever changes.

### Core Innovation Stack:
- **3D Environment Engine (Three.js WebGL):** A deterministic physics simulation rendering a multi-room apartment with thermal-mass objects, dynamic raycasted sunlight with seasonal sun-path adaptation, and ambient temperature drift with humidity modeling.
- **Virtual Computer Vision Layer:** An intersection-detection engine that acts as a "virtual camera," scanning the scene every frame for sun-ray collisions with high-thermal-mass objects, generating thermal heatmaps, and forecasting future thermal threats.
- **Three-Vector Heat Prediction Model:** Predicts imminent heat load across Solar, Occupancy, and Weather Envelope vectors — enhanced with stochastic occupancy, latent humidity load, and 3-day weather forecast lookahead.
- **Multi-Tier Control System:** From basic Feed-Forward PID → to Model Predictive Control (MPC) with 60-minute lookahead → to a trained Reinforcement Learning agent. Three tiers of intelligence, each more powerful than the last.
- **Smart Actuator Orchestration:** The brain decides between closing smart blinds (zero energy cost) and engaging HVAC (energy cost), always picking the cheapest response first.
- **Self-Calibrating Digital Twin:** The system auto-calibrates its thermal mass constants ($C_{thermal}$) using observed temperature data, making it deployable in any room without manual configuration.
- **Live Weather & Carbon Integration:** Pulls real-time outdoor temperature, humidity, cloud cover, and 3-day hourly forecasts from WeatherAPI. Tracks electricity cost with time-of-use pricing and CO₂ emissions with grid carbon intensity data.

### What The Judges Will See:
1. A live 3D/2D multi-room simulation with moving sun, furniture, dynamic light rays, and a photorealistic thermal heatmap.
2. Real-time collision detection with a **Predictive Forecast Panel**: "Sun hits Dark Sofa in 25 minutes. Pre-cooling begins in 10 minutes."
3. A side-by-side comparison: **Standard Mode** (reactive Bang-Bang) vs **Predictive Mode** (MPC + Feed-Forward).
4. Live graphs showing energy consumption, room temperature, HVAC power, comfort scores, and a Sankey energy-flow diagram.
5. A **dollar savings** and **carbon savings** tracker updating in real-time.
6. Smart blinds closing automatically before the AC even needs to engage.
7. Multi-room zone control with thermal diffusion between rooms.
8. A simulated IoT sensor network showing distributed temperature readings fused by a Kalman Filter.
9. Historical playback of past simulation runs with full analytics.
10. Self-calibration mode where the digital twin learns the room's thermal properties.

---

## 2. High-Level System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                               BROWSER (Single Page App)                             │
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────────┐  │
│  │                          PRESENTATION LAYER                                    │  │
│  │                                                                                │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────────────────┐ │  │
│  │  │ 3D/2D Canvas │ │ Control      │ │ Live Charts  │ │ Forecast &            │ │  │
│  │  │ Renderer     │ │ Panel        │ │ Dashboard    │ │ Diagnostics Panel     │ │  │
│  │  │              │ │              │ │              │ │                       │ │  │
│  │  │ - Multi-room │ │ - Mode       │ │ - Chart.js   │ │ - Threat forecast     │ │  │
│  │  │ - Furniture  │ │ - Time speed │ │ - Temp curves│ │ - Anomaly alerts      │ │  │
│  │  │ - Sun rays   │ │ - Occupancy  │ │ - Power      │ │ - Comfort gauge (PMV) │ │  │
│  │  │ - Heatmap    │ │ - Blinds     │ │ - Energy $$  │ │ - Sensor readings     │ │  │
│  │  │ - Blinds     │ │ - Season     │ │ - Carbon CO₂ │ │ - Calibration status  │ │  │
│  │  │ - IoT sensors│ │ - Humidity   │ │ - Sankey     │ │ - Playback controls   │ │  │
│  │  └──────┬───────┘ └──────┬───────┘ │ - Heatmap   │ └───────────┬───────────┘ │  │
│  │         │                │         └──────┬───────┘             │             │  │
│  └─────────┼────────────────┼────────────────┼─────────────────────┼─────────────┘  │
│            │                │                │                     │                 │
│  ┌─────────┼────────────────┼────────────────┼─────────────────────┼─────────────┐  │
│  │         ▼     SIMULATION ENGINE LAYER     ▼                     ▼             │  │
│  │                                                                                │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────────────────┐ │  │
│  │  │ Sun Engine   │ │ Collision    │ │ Multi-Room   │ │ Thermal Heatmap       │ │  │
│  │  │              │ │ Detector     │ │ Physics      │ │ Generator             │ │  │
│  │  │ - Orbital    │ │ (Virtual CV) │ │              │ │                       │ │  │
│  │  │ - Seasonal   │ │              │ │ - Per-zone   │ │ - Pixel-level temps   │ │  │
│  │  │   declination│ │ - 3D Raytrace│ │   temps      │ │ - Bilinear interp     │ │  │
│  │  │ - Cloud      │ │ - Area calc  │ │ - Inter-room │ │ - Color mapping       │ │  │
│  │  │   attenuation│ │ - Shadow     │ │   diffusion  │ │   blue→red            │ │  │
│  │  │ - Forecast   │ │   casting    │ │ - Thermal    │ │ - Heat radiation      │ │  │
│  │  │   lookahead  │ │              │ │   decay      │ │   spread              │ │  │
│  │  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └───────────┬───────────┘ │  │
│  └─────────┼────────────────┼────────────────┼─────────────────────┼─────────────┘  │
│            │                │                │                     │                 │
│  ┌─────────┼────────────────┼────────────────┼─────────────────────┼─────────────┐  │
│  │         ▼      INTELLIGENCE LAYER         ▼                     ▼             │  │
│  │                                                                                │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────────────────┐ │  │
│  │  │ Q_predicted  │ │ Controller   │ │ Kalman       │ │ Anomaly Detector      │ │  │
│  │  │ Calculator   │ │ Stack        │ │ Filter       │ │                       │ │  │
│  │  │              │ │              │ │              │ │ - Baseline model      │ │  │
│  │  │ - Solar      │ │ - Bang-Bang  │ │ - Sensor     │ │ - Deviation tracking  │ │  │
│  │  │ - Occupancy  │ │ - PID + FF   │ │   fusion     │ │ - Window open detect  │ │  │
│  │  │   (stochastic│ │ - MPC        │ │ - Noise      │ │ - HVAC fault detect   │ │  │
│  │  │   model)     │ │ - RL Agent   │ │   rejection  │ │ - Occupancy anomaly   │ │  │
│  │  │ - Envelope   │ │ - Self-Tuner │ │ - Uncertainty│ │                       │ │  │
│  │  │ - Humidity   │ │ - Blind Ctrl │ │   bands      │ │                       │ │  │
│  │  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └───────────┬───────────┘ │  │
│  └─────────┼────────────────┼────────────────┼─────────────────────┼─────────────┘  │
│            │                │                │                     │                 │
│  ┌─────────┼────────────────┼────────────────┼─────────────────────┼─────────────┐  │
│  │         ▼         DATA & API LAYER        ▼                     ▼             │  │
│  │                                                                                │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────────────────┐ │  │
│  │  │ WeatherAPI   │ │ State Store  │ │ Data Logger  │ │ Playback Engine       │ │  │
│  │  │ Client       │ │ (In-Memory)  │ │ & Historian  │ │                       │ │  │
│  │  │              │ │              │ │              │ │ - localStorage save   │ │  │
│  │  │ - Current wx │ │ - All rooms  │ │ - Full time  │ │ - Session replay      │ │  │
│  │  │ - 3-day      │ │ - All zones  │ │   series     │ │ - Scrub timeline      │ │  │
│  │  │   hourly     │ │ - Sensors    │ │ - Sankey     │ │ - Compare runs        │ │  │
│  │  │   forecast   │ │ - Blinds     │ │   flow data  │ │ - Export CSV          │ │  │
│  │  │ - Cloud %    │ │ - Calibration│ │ - Cost & CO₂ │ │                       │ │  │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └───────────────────────┘ │  │
│  └────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                      │
└──────────────────────────────────┬───────────────────────────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
         ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
         │ WeatherAPI   │ │ ElectricityMaps│ │ localStorage │
         │ (Free Tier)  │ │ / WattTime API││ │ (Playback)   │
         │              │ │ (Carbon Data) ││ │              │
         │ GET /current │ │              ││ │ - Session    │
         │ GET /forecast│ │ GET /carbon  ││ │   recordings │
         └──────────────┘ └──────────────┘ └──────────────┘
```

---

## 3. Module Breakdown & Detailed Design

---

### Module 1: Canvas Renderer (`renderer.js`)

**Purpose:** Draws the entire multi-room floorplan, furniture, sun position, light rays, thermal heatmap overlays, smart blinds, IoT sensors, and HVAC indicators on every animation frame.

**Responsibilities:**
- Render multi-room walls, windows (with blind state), doors, and room labels.
- Draw furniture objects with color-coded thermal indicators per room.
- Draw the sun's position and cast visible light-ray polygons through windows (attenuated by blind state and cloud cover).
- Render the **thermal heatmap overlay** (pixel-level temperature gradient across the room).
- Display IoT sensor nodes with their individual temperature readings.
- Show HVAC status indicators per zone (fan icon with power %).
- Render smart blind state (open/half/closed) on each window.
- Display outdoor weather badge, time, and per-room temperatures as HUD overlays.

**Key Constants:**
```javascript
const CANVAS_WIDTH  = 1200;
const CANVAS_HEIGHT = 700;
const ROOM_PADDING  = 30;
```

**Rendering Loop:**
```javascript
function render(ctx, state) {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawRooms(ctx, state.rooms);
    drawFurniture(ctx, state.rooms);
    drawBlinds(ctx, state.rooms);
    drawSunRays(ctx, state.sun, state.intersections, state.blindStates);
    drawThermalHeatmap(ctx, state.heatmap);
    drawIoTSensors(ctx, state.sensors);
    drawHVACIndicators(ctx, state.rooms);
    drawWeatherBadge(ctx, state.weather);
    drawTimeDisplay(ctx, state.simulatedTime);
    drawRoomTemperatures(ctx, state.rooms);
    drawForecastAlert(ctx, state.forecast);
}
```

---

### Module 2: Sun Engine (`sun.js`)

**Purpose:** Simulates the sun's orbital path across the sky with **seasonal declination** and generates raycasts through each room's windows, attenuated by cloud cover.

**Seasonal Sun-Path Model:**

The sun's elevation angle changes throughout the year based on the solar declination:

$$\delta = 23.45° \times \sin\left(\frac{360}{365}(284 + d)\right)$$

Where $d$ is the day of the year. This changes the angle of incoming rays:
- **Summer (June):** $\delta \approx +23.45°$ → steep rays, penetrate deep into rooms.
- **Winter (December):** $\delta \approx -23.45°$ → shallow rays, barely enter through windows.
- **Equinox (March/Sept):** $\delta \approx 0°$ → moderate penetration.

**Solar Intensity with Cloud Attenuation:**
```javascript
function getSunIntensity(hourOfDay, cloudCoverPercent) {
    if (hourOfDay < 6 || hourOfDay > 18) return 0;
    const baseSolar = Math.sin(((hourOfDay - 6) / 12) * Math.PI);
    const cloudFactor = 1 - (cloudCoverPercent / 100) * 0.85;
    return baseSolar * cloudFactor;
}
```

**Seasonal Angle Calculation:**
```javascript
function getSunAngle(hourOfDay, dayOfYear, latitude) {
    const declination = 23.45 * Math.sin((2 * Math.PI / 365) * (284 + dayOfYear));
    const hourAngle = (hourOfDay - 12) * 15; // 15° per hour
    const elevation = Math.asin(
        Math.sin(latitude * Math.PI/180) * Math.sin(declination * Math.PI/180) +
        Math.cos(latitude * Math.PI/180) * Math.cos(declination * Math.PI/180) *
        Math.cos(hourAngle * Math.PI/180)
    );
    const azimuth = Math.atan2(
        Math.sin(hourAngle * Math.PI/180),
        Math.cos(hourAngle * Math.PI/180) * Math.sin(latitude * Math.PI/180) -
        Math.tan(declination * Math.PI/180) * Math.cos(latitude * Math.PI/180)
    );
    return { elevation: elevation * 180/Math.PI, azimuth: azimuth * 180/Math.PI };
}
```

**Ray Generation Per Window:**
```javascript
function generateSunRays(sunAngles, windows, numRaysPerWindow = 20) {
    const allRays = [];
    for (const win of windows) {
        if (win.blindState === 'closed') continue;
        const blindAttenuation = win.blindState === 'half' ? 0.4 : 1.0;
        for (let i = 0; i < numRaysPerWindow; i++) {
            const originX = win.x + (i / numRaysPerWindow) * win.width;
            const originY = win.y;
            const angleRad = (sunAngles.azimuth * Math.PI) / 180;
            allRays.push({
                x1: originX, y1: originY,
                x2: originX + Math.cos(angleRad) * 800,
                y2: originY + Math.sin(angleRad) * 800,
                intensity: getSunIntensity(currentHour, cloudCover) * blindAttenuation,
                roomId: win.roomId
            });
        }
    }
    return allRays;
}
```

**Forecast Lookahead — Predict Future Intersections:**
```javascript
function forecastThreats(currentHour, objects, windows, forecastHours = 2) {
    const threats = [];
    for (let h = currentHour; h < Math.min(currentHour + forecastHours, 18); h += 0.1) {
        const futureAngles = getSunAngle(h, dayOfYear, latitude);
        const futureRays = generateSunRays(futureAngles, windows);
        const futureHits = detectAllIntersections(futureRays, objects);
        for (const hit of futureHits) {
            if (hit.isIntersecting && hit.thermalMass > 0.4) {
                const minutesUntil = (h - currentHour) * 60;
                if (!threats.find(t => t.objectId === hit.objectId)) {
                    threats.push({
                        objectId: hit.objectId,
                        objectLabel: objects.find(o => o.id === hit.objectId).label,
                        minutesUntil: Math.round(minutesUntil),
                        estimatedHeatSpike: hit.intersectArea * hit.thermalMass,
                        roomId: hit.roomId
                    });
                }
            }
        }
    }
    return threats.sort((a, b) => a.minutesUntil - b.minutesUntil);
}
```

---

### Module 3: Collision Detector / Virtual CV Layer (`collision.js`)

**Purpose:** Acts as the "virtual camera." Every frame, tests all sun rays against all furniture bounding boxes across all rooms to determine which objects are being irradiated and by how much. Supports both 2D AABB and 3D raycasting modes.

**3D Raycasting (Three.js mode):**
```javascript
// Using Three.js Raycaster for accurate 3D intersection
function detect3DIntersections(sunDirection, scene, objectMeshes) {
    const raycaster = new THREE.Raycaster();
    const results = [];

    for (const mesh of objectMeshes) {
        raycaster.set(sunOrigin, sunDirection);
        const intersects = raycaster.intersectObject(mesh);
        if (intersects.length > 0) {
            const hitArea = calculateExposedSurfaceArea(intersects, mesh);
            results.push({
                objectId:       mesh.userData.id,
                isIntersecting: true,
                intersectArea:  hitArea,
                thermalMass:    mesh.userData.thermalMass,
                roomId:         mesh.userData.roomId
            });
        }
    }
    return results;
}
```

**2D AABB Fallback (Canvas mode):**
```javascript
function getAABBIntersection(ray, objectBBox) {
    const clippedX1 = Math.max(ray.x1, objectBBox.x);
    const clippedX2 = Math.min(ray.x2, objectBBox.x + objectBBox.width);
    const clippedY1 = Math.max(ray.y1, objectBBox.y);
    const clippedY2 = Math.min(ray.y2, objectBBox.y + objectBBox.height);
    if (clippedX1 < clippedX2 && clippedY1 < clippedY2) {
        return { hit: true, area: (clippedX2 - clippedX1) * (clippedY2 - clippedY1) };
    }
    return { hit: false, area: 0 };
}

function detectAllIntersections(rays, objects) {
    const results = [];
    for (const obj of objects) {
        let totalArea = 0, hitCount = 0;
        for (const ray of rays) {
            const result = getAABBIntersection(ray, obj.bbox);
            if (result.hit) { totalArea += result.area; hitCount++; }
        }
        results.push({
            objectId: obj.id, isIntersecting: hitCount > 0,
            intersectArea: totalArea, thermalMass: obj.thermalMass,
            roomId: obj.roomId
        });
    }
    return results;
}
```

---

### Module 4: Thermal Heatmap Generator (`heatmap.js`)

**Purpose:** Generates a pixel-level thermal heatmap across the entire room floor, showing heat radiating outward from irradiated objects and diffusing through space over time.

**Algorithm:**
1. Divide the room floor into a grid (e.g., 1 cell = 5×5 pixels).
2. Each heated object acts as a heat source, injecting temperature into its grid cells.
3. Heat diffuses outward using a discrete heat equation (Laplacian diffusion).
4. Color-map each cell from blue (cool) → green → yellow → red (hot).

```javascript
class ThermalHeatmap {
    constructor(width, height, cellSize = 5) {
        this.cols = Math.ceil(width / cellSize);
        this.rows = Math.ceil(height / cellSize);
        this.cellSize = cellSize;
        this.grid = new Float32Array(this.cols * this.rows).fill(0);
        this.diffusionRate = 0.1;
        this.decayRate = 0.005;
    }

    injectHeat(objects, intersections) {
        for (const inter of intersections) {
            if (!inter.isIntersecting) continue;
            const obj = objects.find(o => o.id === inter.objectId);
            const cx1 = Math.floor(obj.bbox.x / this.cellSize);
            const cy1 = Math.floor(obj.bbox.y / this.cellSize);
            const cx2 = Math.floor((obj.bbox.x + obj.bbox.width) / this.cellSize);
            const cy2 = Math.floor((obj.bbox.y + obj.bbox.height) / this.cellSize);
            for (let y = cy1; y <= cy2; y++) {
                for (let x = cx1; x <= cx2; x++) {
                    if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
                        this.grid[y * this.cols + x] += inter.thermalMass * 0.1;
                    }
                }
            }
        }
    }

    diffuse() {
        const next = new Float32Array(this.grid.length);
        for (let y = 1; y < this.rows - 1; y++) {
            for (let x = 1; x < this.cols - 1; x++) {
                const idx = y * this.cols + x;
                const laplacian =
                    this.grid[idx - 1] + this.grid[idx + 1] +
                    this.grid[idx - this.cols] + this.grid[idx + this.cols] -
                    4 * this.grid[idx];
                next[idx] = this.grid[idx] + this.diffusionRate * laplacian - this.decayRate * this.grid[idx];
                next[idx] = Math.max(0, next[idx]);
            }
        }
        this.grid = next;
    }

    getColor(value) {
        // Blue → Cyan → Green → Yellow → Red
        const clamped = Math.min(1, value);
        if (clamped < 0.25) return `rgba(0, 0, ${Math.round(clamped*4*255)}, ${clamped*2})`;
        if (clamped < 0.50) return `rgba(0, ${Math.round((clamped-0.25)*4*255)}, 255, ${clamped})`;
        if (clamped < 0.75) return `rgba(${Math.round((clamped-0.5)*4*255)}, 255, 0, ${clamped})`;
        return `rgba(255, ${Math.round((1-clamped)*4*255)}, 0, ${Math.min(0.7, clamped)})`;
    }

    render(ctx) {
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const val = this.grid[y * this.cols + x];
                if (val > 0.01) {
                    ctx.fillStyle = this.getColor(val);
                    ctx.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
                }
            }
        }
    }
}
```

---

### Module 5: Q-Predicted Calculator (`predictor.js`)

**Purpose:** Computes the unified predicted heat load ($Q_{predicted}$) every frame across **five** environmental vectors: Solar, Occupancy (stochastic), Envelope, Humidity (latent), and Thermal Decay.

**Enhanced Equation:**

$$Q_{predicted} = \underbrace{\sum_{i=1}^{n} (I_{sun} \cdot A_{intersect,i} \cdot C_{thermal,i})}_{\text{Solar Load}} + \underbrace{E[N_{people}] \cdot M_{heat}}_{\text{Stochastic Occupancy}} + \underbrace{U_{env} \cdot A_{env} \cdot \Delta T_{api}}_{\text{Envelope Load}} + \underbrace{\dot{m}_{air} \cdot h_{fg} \cdot \Delta\omega}_{\text{Latent Humidity Load}} + \underbrace{\sum_{j} S_j \cdot e^{-\lambda t_j}}_{\text{Thermal Decay (Stored Heat)}}$$

**Implementation:**
```javascript
const ASHRAE_METABOLIC_HEAT = 0.12;   // kW per person
const U_ENVELOPE            = 0.35;   // W/m²·K
const A_ENVELOPE            = 45;     // m²
const LATENT_HEAT_COEFF     = 0.003;  // simplified humidity load factor
const THERMAL_DECAY_RATE    = 0.02;   // exponential decay λ

function calculateQPredicted(intersections, sunIntensity, occupancyModel, weather, rooms, dt) {
    // Vector 1: Solar Load
    let solarLoad = 0;
    for (const item of intersections) {
        if (item.isIntersecting) {
            solarLoad += sunIntensity * item.intersectArea * item.thermalMass;
        }
    }

    // Vector 2: Stochastic Occupancy Load
    const expectedOccupants = occupancyModel.getExpectedOccupancy(currentHour);
    const occupancyLoad = expectedOccupants * ASHRAE_METABOLIC_HEAT;

    // Vector 3: Envelope Load
    const avgIndoorTemp = rooms.reduce((sum, r) => sum + r.tempF, 0) / rooms.length;
    const deltaT = Math.max(0, weather.outdoorTempF - avgIndoorTemp);
    const envelopeLoad = U_ENVELOPE * A_ENVELOPE * deltaT;

    // Vector 4: Latent Humidity Load
    const deltaHumidity = Math.max(0, weather.humidity - 50); // above 50% baseline
    const latentLoad = LATENT_HEAT_COEFF * deltaHumidity * A_ENVELOPE;

    // Vector 5: Thermal Decay (stored heat from previously irradiated objects)
    let decayLoad = 0;
    for (const room of rooms) {
        for (const obj of room.objects) {
            obj.storedHeat *= Math.exp(-THERMAL_DECAY_RATE * dt);
            if (intersections.find(i => i.objectId === obj.id && i.isIntersecting)) {
                obj.storedHeat += sunIntensity * obj.thermalMass * dt;
            }
            decayLoad += obj.storedHeat * 0.1; // radiation fraction
        }
    }

    return {
        total:     solarLoad + occupancyLoad + envelopeLoad + latentLoad + decayLoad,
        solar:     solarLoad,
        occupancy: occupancyLoad,
        envelope:  envelopeLoad,
        latent:    latentLoad,
        decay:     decayLoad
    };
}
```

---

### Module 6: Multi-Signal Occupancy Fusion Engine (`occupancy.js`)

**Purpose:** Estimates room occupancy by fusing **four independent signals** through a weighted average — far beyond the simple time-based lookup used by traditional smart thermostats. This module is environment-aware (Household vs Commercial baselines differ).

**The 4 Occupancy Signals:**

| # | Signal | Sensor | Household Baseline | Commercial Baseline | Weight |
|---|--------|--------|-------|---------|--------|
| 1 | ⏰ Time-Based Prior | Clock | Peaks 6 PM (dinner) | Peaks 10 AM (full office) | 15% |
| 2 | 📶 WiFi Device Count | Router API / Simulated | 3 IoT + 2/person | 8 IoT + 2.5/person | **40%** |
| 3 | 🔊 Ambient Noise (dB) | Microphone / Simulated | 30 dB base + 7 dB/person | 35 dB base + 5 dB/person | 20% |
| 4 | 💡 Appliance State | Smart Plugs / Simulated | lights, fans, monitors | lights, fans, monitors | 25% |

**Fusion Formula:**

$$\hat{N}_{occupancy} = w_{time} \cdot \hat{N}_{time} + w_{wifi} \cdot \hat{N}_{wifi} + w_{noise} \cdot \hat{N}_{noise} + w_{app} \cdot \hat{N}_{appliance}$$

Where $w_{wifi} = 0.40$ is the highest weight because device count is the most reliable proxy for human presence.

```javascript
class StochasticOccupancyModel {
    constructor() {
        // Signal 1: Time-based probability schedule (Household)
        this.schedule = {
            0: { mean: 2, std: 0.5 },    6: { mean: 2, std: 0.3 },
            7: { mean: 1.5, std: 0.8 },   8: { mean: 0.5, std: 0.5 },
            9: { mean: 0.2, std: 0.3 },   12: { mean: 0.5, std: 0.5 },
            14: { mean: 0.2, std: 0.3 },  17: { mean: 1.5, std: 0.8 },
            18: { mean: 2.5, std: 0.5 },  20: { mean: 2, std: 0.3 },
            22: { mean: 2, std: 0.3 },
        };
        // Signal 1: Time-based probability schedule (Commercial)
        this.commercialSchedule = {
            0: { mean: 0, std: 0.1 },     6: { mean: 0.5, std: 0.3 },
            7: { mean: 3, std: 1.0 },      8: { mean: 12, std: 2.0 },
            9: { mean: 18, std: 3.0 },     10: { mean: 20, std: 2.0 },
            12: { mean: 10, std: 3.0 },    13: { mean: 15, std: 2.0 },
            14: { mean: 20, std: 2.0 },    17: { mean: 8, std: 3.0 },
            18: { mean: 2, std: 1.0 },     20: { mean: 0.5, std: 0.3 },
            22: { mean: 0, std: 0.1 },
        };
    }

    // Signal 1: Time-Based Prior (Bayesian Baseline)
    getTimePrior(hour, isCommercial = false) { /* linear interpolation */ }

    // Signal 2: WiFi Device Count (2 devices per person + IoT baseline)
    simulateWiFiDevices(trueOccupancy, isCommercial) { /* Gaussian noise */ }
    estimateFromWiFi(deviceCount, isCommercial) { /* inverse mapping */ }

    // Signal 3: Ambient Noise Level (dB)
    simulateNoiseLevel(trueOccupancy, isCommercial) { /* base + N*perPerson + noise */ }
    estimateFromNoise(noiseDb, isCommercial) { /* inverse mapping */ }

    // Signal 4: Active Appliances (Lights, Fans, Monitors)
    simulateAppliances(trueOccupancy, hour, isCommercial) { /* returns {lightsOn, fansOn, monitorsOn} */ }
    estimateFromAppliances(appliances, isCommercial) { /* inverse mapping */ }

    // FUSION: Weighted average of all 4 signals
    fuseOccupancy(hour, wifiDevices, noiseDb, appliances, isCommercial) {
        const weights = { time: 0.15, wifi: 0.40, noise: 0.20, appliance: 0.25 };
        const fusedEstimate =
            weights.time * timePrior +
            weights.wifi * wifiEstimate +
            weights.noise * noiseEstimate +
            weights.appliance * appEstimate;
        return { fused, signals: { timePrior, wifiEstimate, noiseEstimate, applianceEstimate, wifiDevices, noiseDb, lightsOn, fansOn, monitorsOn }, weights };
    }

    // Full Pipeline: Simulate ground truth → generate sensor readings → fuse
    getExpectedOccupancy(hour, isCommercial = false) {
        const trueOccupancy = /* from time prior + randomness */;
        const wifiDevices = this.simulateWiFiDevices(trueOccupancy, isCommercial);
        const noiseDb = this.simulateNoiseLevel(trueOccupancy, isCommercial);
        const appliances = this.simulateAppliances(trueOccupancy, hour, isCommercial);
        return this.fuseOccupancy(hour, wifiDevices, noiseDb, appliances, isCommercial);
    }
}
```

**UI Panel — Occupancy Intelligence:**
```html
<div class="occupancy-panel" id="occupancy-panel">
    <h3>Occupancy Intelligence</h3>
    <div class="occ-signals">
        <div class="occ-signal">📶 WiFi Devices: <span id="occ-wifi">0</span></div>
        <div class="occ-signal">🔊 Noise Level: <span id="occ-noise">30</span> dB</div>
        <div class="occ-signal">💡 Lights On: <span id="occ-lights">0</span></div>
        <div class="occ-signal">🌀 Fans On: <span id="occ-fans">0</span></div>
        <div class="occ-signal">🖥️ Monitors On: <span id="occ-monitors">0</span></div>
    </div>
    <div id="occ-fused" class="occ-fused">Fused Estimate: 0 people</div>
</div>
```

---

### Module 7: Controller Stack (`controller.js`)

**Purpose:** Houses the entire hierarchy of control algorithms: Bang-Bang (baseline), PID+FF, MPC, RL Agent, and Self-Tuner.

#### 7A. Feed-Forward PID Controller
```javascript
class FeedForwardPIDController {
    constructor(Kp, Ki, Kd, Kff) {
        this.Kp = Kp; this.Ki = Ki; this.Kd = Kd; this.Kff = Kff;
        this.integral = 0; this.previousError = 0;
    }
    compute(currentTemp, targetTemp, qPredicted, dt) {
        const error = currentTemp - targetTemp;
        const P = this.Kp * error;
        this.integral += error * dt;
        this.integral = Math.max(-50, Math.min(50, this.integral));
        const I = this.Ki * this.integral;
        const D = this.Kd * ((error - this.previousError) / dt);
        this.previousError = error;
        const FF = this.Kff * qPredicted;
        return Math.max(0, Math.min(100, P + I + D + FF));
    }
    reset() { this.integral = 0; this.previousError = 0; }
}
```

#### 7B. Model Predictive Controller (MPC)
```javascript
class ModelPredictiveController {
    constructor(horizonMinutes = 60, stepsPerHorizon = 12) {
        this.horizon = horizonMinutes;
        this.steps = stepsPerHorizon;
        this.lambda = 0.1; // energy penalty weight
    }

    compute(currentTemp, targetTemp, currentHour, rooms, objects, windows, weather, dt) {
        const stepSize = this.horizon / this.steps; // minutes per step
        let bestSchedule = [];
        let bestCost = Infinity;

        // Evaluate candidate HVAC power schedules
        const candidates = this.generateCandidateSchedules();

        for (const schedule of candidates) {
            let simTemp = currentTemp;
            let cost = 0;

            for (let step = 0; step < this.steps; step++) {
                const futureHour = currentHour + (step * stepSize) / 60;
                const futureAngles = getSunAngle(futureHour, dayOfYear, latitude);
                const futureIntensity = getSunIntensity(futureHour, weather.cloud);
                const futureRays = generateSunRays(futureAngles, windows);
                const futureHits = detectAllIntersections(futureRays, objects);

                let futureQ = 0;
                for (const hit of futureHits) {
                    if (hit.isIntersecting) {
                        futureQ += futureIntensity * hit.intersectArea * hit.thermalMass;
                    }
                }

                const hvacPower = schedule[step];
                simTemp = updateRoomTemperature(simTemp, futureQ, hvacPower, stepSize * 60);

                // Cost = temperature deviation² + energy penalty
                cost += Math.pow(simTemp - targetTemp, 2) + this.lambda * Math.pow(hvacPower, 2);
            }

            if (cost < bestCost) {
                bestCost = cost;
                bestSchedule = schedule;
            }
        }

        return bestSchedule[0]; // Apply only the first step (receding horizon)
    }

    generateCandidateSchedules() {
        const schedules = [];
        const powerLevels = [0, 10, 20, 30, 50, 75, 100];
        // Generate a set of candidate schedules (simplified grid search)
        for (let i = 0; i < 50; i++) {
            const schedule = [];
            for (let s = 0; s < this.steps; s++) {
                schedule.push(powerLevels[Math.floor(Math.random() * powerLevels.length)]);
            }
            schedules.push(schedule);
        }
        // Also add an all-off and all-on schedule as baselines
        schedules.push(new Array(this.steps).fill(0));
        schedules.push(new Array(this.steps).fill(100));
        return schedules;
    }
}
```

#### 7C. Self-Tuning PID via Gradient Descent
```javascript
class SelfTuningPID {
    constructor(basePID) {
        this.pid = basePID;
        this.learningRate = 0.001;
        this.costHistory = [];
        this.paramHistory = [];
    }

    runEpoch(simulationFn) {
        // Run a full day simulation and compute cost
        const cost = simulationFn(this.pid.Kp, this.pid.Ki, this.pid.Kd, this.pid.Kff);
        this.costHistory.push(cost);
        this.paramHistory.push({ ...this.pid });

        // Numerical gradient estimation via perturbation
        const epsilon = 0.01;
        const params = ['Kp', 'Ki', 'Kd', 'Kff'];

        for (const param of params) {
            const original = this.pid[param];

            this.pid[param] = original + epsilon;
            const costPlus = simulationFn(this.pid.Kp, this.pid.Ki, this.pid.Kd, this.pid.Kff);

            this.pid[param] = original - epsilon;
            const costMinus = simulationFn(this.pid.Kp, this.pid.Ki, this.pid.Kd, this.pid.Kff);

            const gradient = (costPlus - costMinus) / (2 * epsilon);
            this.pid[param] = original - this.learningRate * gradient;
            this.pid[param] = Math.max(0, this.pid[param]); // clamp non-negative
        }

        return { cost, params: { ...this.pid } };
    }
}
```

#### 7D. Reinforcement Learning Agent (Deep Q-Network Skeleton)
```javascript
class RLAgent {
    constructor(stateSize = 8, actionCount = 7) {
        this.stateSize = stateSize;
        this.actionCount = actionCount; // [0%, 10%, 20%, 30%, 50%, 75%, 100%]
        this.actions = [0, 10, 20, 30, 50, 75, 100];
        this.epsilon = 0.3;          // exploration rate
        this.gamma = 0.95;           // discount factor
        this.learningRate = 0.01;
        this.memory = [];            // replay buffer
        this.maxMemory = 10000;

        // Simple Q-table (upgrade to neural net for production)
        this.qTable = {};
    }

    getState(currentTemp, targetTemp, qPredicted, hour, humidity, outdoorTemp, hvacPower, blindState) {
        // Discretize state for Q-table
        return [
            Math.round(currentTemp),
            Math.round(targetTemp),
            Math.round(qPredicted * 10) / 10,
            Math.round(hour),
            Math.round(humidity / 10),
            Math.round(outdoorTemp / 5) * 5,
            Math.round(hvacPower / 20) * 20,
            blindState
        ].join(',');
    }

    selectAction(stateKey) {
        if (Math.random() < this.epsilon) {
            return Math.floor(Math.random() * this.actionCount); // explore
        }
        const qValues = this.qTable[stateKey] || new Array(this.actionCount).fill(0);
        return qValues.indexOf(Math.max(...qValues)); // exploit
    }

    learn(state, action, reward, nextState) {
        if (!this.qTable[state]) this.qTable[state] = new Array(this.actionCount).fill(0);
        if (!this.qTable[nextState]) this.qTable[nextState] = new Array(this.actionCount).fill(0);

        const maxNextQ = Math.max(...this.qTable[nextState]);
        const target = reward + this.gamma * maxNextQ;
        this.qTable[state][action] += this.learningRate * (target - this.qTable[state][action]);
    }

    getReward(currentTemp, targetTemp, hvacPower, comfortScore) {
        const tempPenalty = -Math.pow(currentTemp - targetTemp, 2);
        const energyPenalty = -0.1 * hvacPower;
        const comfortBonus = (Math.abs(comfortScore) < 0.5) ? 5 : 0;
        return tempPenalty + energyPenalty + comfortBonus;
    }
}
```

---

### Module 8: Smart Blind Controller (`blinds.js`)

**Purpose:** Manages smart window blinds as the **first-response actuator** — closing blinds costs zero energy, so the system always tries this before engaging the AC.

```javascript
class SmartBlindController {
    constructor(windows) {
        this.windows = windows; // each window has { id, roomId, blindState: 'open'|'half'|'closed' }
    }

    evaluate(forecast, qPredicted, rooms) {
        const commands = [];

        for (const window of this.windows) {
            const room = rooms.find(r => r.id === window.roomId);
            const roomThreats = forecast.filter(t => t.roomId === window.roomId);

            // Strategy 1: Close blinds if a high-thermal-mass threat is imminent
            if (roomThreats.some(t => t.estimatedHeatSpike > 0.5 && t.minutesUntil < 15)) {
                commands.push({ windowId: window.id, action: 'close', reason: 'Imminent high-thermal threat' });
            }
            // Strategy 2: Half-close if moderate threat
            else if (roomThreats.some(t => t.estimatedHeatSpike > 0.2 && t.minutesUntil < 30)) {
                commands.push({ windowId: window.id, action: 'half', reason: 'Moderate threat approaching' });
            }
            // Strategy 3: Open blinds if no threat and natural light is beneficial
            else if (room.tempF < room.targetTempF && !roomThreats.length) {
                commands.push({ windowId: window.id, action: 'open', reason: 'Passive solar heating beneficial' });
            }
            // Strategy 4: Keep current state if no change needed
            else {
                commands.push({ windowId: window.id, action: window.blindState, reason: 'No change needed' });
            }
        }

        return commands;
    }

    getHVACReduction(blindCommands) {
        // Calculate how much HVAC load was avoided by blind actions
        let avoided = 0;
        for (const cmd of blindCommands) {
            if (cmd.action === 'closed') avoided += 0.85; // 85% solar blocked
            if (cmd.action === 'half') avoided += 0.40;   // 40% solar blocked
        }
        return avoided;
    }
}
```

---

### Module 9: Kalman Filter (`kalman.js`)

**Purpose:** Fuses noisy readings from multiple simulated IoT temperature sensors into a clean, probabilistic state estimate with uncertainty bands.

```javascript
class KalmanFilter {
    constructor(processNoise = 0.01, measurementNoise = 0.5) {
        this.x = 72;           // state estimate (temperature)
        this.P = 1;            // estimation uncertainty
        this.Q = processNoise; // process noise
        this.R = measurementNoise; // measurement noise
    }

    predict(controlInput = 0) {
        // State prediction: temp changes due to physics
        this.x = this.x + controlInput;
        this.P = this.P + this.Q;
    }

    update(measurement) {
        // Kalman gain
        const K = this.P / (this.P + this.R);
        // Update estimate
        this.x = this.x + K * (measurement - this.x);
        // Update uncertainty
        this.P = (1 - K) * this.P;

        return {
            estimate: this.x,
            uncertainty: Math.sqrt(this.P),
            kalmanGain: K
        };
    }
}

class MultiSensorFusion {
    constructor(sensorCount) {
        this.sensors = [];
        this.filters = [];
        for (let i = 0; i < sensorCount; i++) {
            this.sensors.push({ id: `sensor_${i}`, noise: 0.3 + Math.random() * 0.7 });
            this.filters.push(new KalmanFilter(0.01, this.sensors[i].noise));
        }
    }

    fuseMeasurements(trueTemp) {
        const readings = [];
        for (let i = 0; i < this.sensors.length; i++) {
            // Simulate noisy sensor reading
            const noise = (Math.random() - 0.5) * 2 * this.sensors[i].noise;
            const rawReading = trueTemp + noise;

            this.filters[i].predict();
            const filtered = this.filters[i].update(rawReading);

            readings.push({
                sensorId: this.sensors[i].id,
                raw: rawReading,
                filtered: filtered.estimate,
                uncertainty: filtered.uncertainty
            });
        }

        // Weighted average of all filtered readings (inverse variance weighting)
        let weightedSum = 0, weightSum = 0;
        for (const r of readings) {
            const w = 1 / (r.uncertainty * r.uncertainty);
            weightedSum += r.filtered * w;
            weightSum += w;
        }

        return {
            fusedEstimate: weightedSum / weightSum,
            fusedUncertainty: Math.sqrt(1 / weightSum),
            sensorReadings: readings
        };
    }
}
```

---

### Module 10: Anomaly Detector (`anomaly.js`)

**Purpose:** Detects when the room's thermal behavior deviates from the digital twin's prediction, flagging real-world issues.

```javascript
class AnomalyDetector {
    constructor(windowSize = 60) {
        this.expectedTemps = [];
        this.actualTemps = [];
        this.windowSize = windowSize;
        this.threshold = 2.0; // °F deviation to trigger alert
        this.alerts = [];
    }

    check(expectedTemp, actualTemp, hvacPower, qPredicted, weather) {
        this.expectedTemps.push(expectedTemp);
        this.actualTemps.push(actualTemp);

        if (this.expectedTemps.length < 10) return null;

        // Keep rolling window
        if (this.expectedTemps.length > this.windowSize) {
            this.expectedTemps.shift();
            this.actualTemps.shift();
        }

        const deviation = actualTemp - expectedTemp;
        const avgDeviation = this.getRunningAverage();

        let alert = null;

        // Case 1: Room cooling faster than expected → window likely open
        if (avgDeviation < -this.threshold && weather.outdoorTempF < actualTemp) {
            alert = {
                type: 'WINDOW_OPEN',
                severity: 'WARNING',
                message: `Room cooling ${Math.abs(avgDeviation).toFixed(1)}°F faster than predicted. Possible open window detected.`,
                suggestion: 'Close windows for optimal HVAC efficiency.'
            };
        }
        // Case 2: Room heating faster than expected → unexpected occupancy or heat source
        else if (avgDeviation > this.threshold && qPredicted.solar < 0.1) {
            alert = {
                type: 'UNEXPECTED_HEAT',
                severity: 'INFO',
                message: `Room ${avgDeviation.toFixed(1)}°F warmer than predicted with no solar load. Possible unmodeled heat source.`,
                suggestion: 'Check for additional occupants, appliances, or cooking activity.'
            };
        }
        // Case 3: HVAC running but no cooling effect → equipment degradation
        else if (hvacPower > 50 && avgDeviation > this.threshold) {
            alert = {
                type: 'HVAC_DEGRADATION',
                severity: 'CRITICAL',
                message: `HVAC at ${hvacPower}% power but room is ${avgDeviation.toFixed(1)}°F warmer than expected. Possible equipment fault.`,
                suggestion: 'Schedule HVAC maintenance. Check refrigerant levels and filter.'
            };
        }

        if (alert) this.alerts.push({ ...alert, timestamp: Date.now() });
        return alert;
    }

    getRunningAverage() {
        const recent = this.actualTemps.slice(-10);
        const recentExpected = this.expectedTemps.slice(-10);
        let sum = 0;
        for (let i = 0; i < recent.length; i++) sum += recent[i] - recentExpected[i];
        return sum / recent.length;
    }
}
```

---

### Module 11: Multi-Room Physics Engine (`physics.js`)

**Purpose:** Simulates thermal behavior for multiple rooms with inter-room heat diffusion through shared walls and doorways.

```javascript
const ROOM_THERMAL_CAPACITANCE = 500;
const HVAC_COOLING_POWER       = 5.0;
const WALL_CONDUCTANCE         = 0.15;  // heat transfer rate through interior walls
const DOOR_CONDUCTANCE         = 0.60;  // heat transfer rate through open doorways

function updateMultiRoomTemperatures(rooms, connections, qPredictedPerRoom, hvacPowerPerRoom, dt) {
    const newTemps = {};

    for (const room of rooms) {
        const q = qPredictedPerRoom[room.id] || 0;
        const hvac = hvacPowerPerRoom[room.id] || 0;

        // Heat gain from sources
        const heatGain = (q / ROOM_THERMAL_CAPACITANCE) * dt;

        // Heat removed by HVAC
        const heatRemoval = (HVAC_COOLING_POWER * (hvac / 100) / 60) * dt;

        // Inter-room heat diffusion
        let diffusion = 0;
        for (const conn of connections) {
            if (conn.roomA === room.id || conn.roomB === room.id) {
                const otherRoomId = conn.roomA === room.id ? conn.roomB : conn.roomA;
                const otherRoom = rooms.find(r => r.id === otherRoomId);
                const conductance = conn.type === 'door' ? DOOR_CONDUCTANCE : WALL_CONDUCTANCE;
                diffusion += conductance * (otherRoom.tempF - room.tempF) * dt / 3600;
            }
        }

        newTemps[room.id] = room.tempF + heatGain - heatRemoval + diffusion;
    }

    // Apply new temperatures
    for (const room of rooms) {
        room.tempF = newTemps[room.id];
    }
}
```

---

### Module 12: Digital Twin Calibration Engine (`calibration.js`)

**Purpose:** Auto-calibrates the $C_{thermal}$ values for each object by observing how the room's temperature actually changes compared to predictions, then adjusting constants via least-squares fitting.

```javascript
class DigitalTwinCalibrator {
    constructor(objects) {
        this.objects = objects;
        this.observations = []; // { timestamp, predictedTemp, actualTemp, activeIntersections }
        this.isCalibrating = false;
        this.calibrationCycles = 0;
    }

    startCalibration() {
        this.isCalibrating = true;
        this.observations = [];
        this.calibrationCycles = 0;
        return { status: 'CALIBRATING', message: 'Collecting thermal observations...' };
    }

    recordObservation(predictedTemp, actualTemp, intersections) {
        if (!this.isCalibrating) return;
        this.observations.push({
            timestamp: Date.now(),
            predicted: predictedTemp,
            actual: actualTemp,
            intersections: intersections.map(i => ({
                objectId: i.objectId,
                area: i.intersectArea,
                isHit: i.isIntersecting
            }))
        });
    }

    runCalibration() {
        if (this.observations.length < 50) {
            return { status: 'INSUFFICIENT_DATA', message: `Need ${50 - this.observations.length} more observations.` };
        }

        // Least-squares adjustment of C_thermal per object
        for (const obj of this.objects) {
            const relevantObs = this.observations.filter(obs =>
                obs.intersections.some(i => i.objectId === obj.id && i.isHit)
            );

            if (relevantObs.length < 5) continue;

            // Calculate average prediction error when this object is being heated
            let totalError = 0;
            for (const obs of relevantObs) {
                totalError += obs.actual - obs.predicted;
            }
            const avgError = totalError / relevantObs.length;

            // Adjust C_thermal proportionally to the error
            const adjustment = avgError * 0.05; // conservative adjustment
            obj.thermalMass = Math.max(0.05, Math.min(0.99, obj.thermalMass + adjustment));
        }

        this.calibrationCycles++;
        this.isCalibrating = false;

        return {
            status: 'COMPLETE',
            cycle: this.calibrationCycles,
            updatedObjects: this.objects.map(o => ({ id: o.id, label: o.label, newThermalMass: o.thermalMass }))
        };
    }
}
```

---

### Module 13: Weather API Client — Enhanced (`weather.js`)

**Purpose:** Fetches both **current conditions** AND a **3-day hourly forecast** from WeatherAPI.com. Cloud cover data is used to attenuate solar intensity. Forecast data feeds the MPC controller's lookahead.

```javascript
const WEATHER_API_KEY = 'YOUR_API_KEY';
const WEATHER_CITY   = 'Mumbai';

async function fetchCurrentWeather() {
    try {
        const res = await fetch(
            `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${WEATHER_CITY}`
        );
        const data = await res.json();
        return {
            tempC: data.current.temp_c,
            tempF: data.current.temp_f,
            humidity: data.current.humidity,
            cloud: data.current.cloud,            // 0-100%
            condition: data.current.condition.text,
            feelsLikeC: data.current.feelslike_c,
            feelsLikeF: data.current.feelslike_f,
            uv: data.current.uv,
            lastUpdated: data.current.last_updated
        };
    } catch (err) {
        console.error('Weather fetch failed:', err);
        return { tempC: 35, tempF: 95, humidity: 60, cloud: 0, condition: 'Fallback' };
    }
}

async function fetchHourlyForecast() {
    try {
        const res = await fetch(
            `https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${WEATHER_CITY}&days=3&aqi=no`
        );
        const data = await res.json();
        const hourly = [];
        for (const day of data.forecast.forecastday) {
            for (const hour of day.hour) {
                hourly.push({
                    datetime: hour.time,
                    tempC: hour.temp_c,
                    tempF: hour.temp_f,
                    humidity: hour.humidity,
                    cloud: hour.cloud,
                    chanceOfRain: hour.chance_of_rain,
                    condition: hour.condition.text,
                    uv: hour.uv
                });
            }
        }
        return hourly;
    } catch (err) {
        console.error('Forecast fetch failed:', err);
        return [];
    }
}

function getForecastAtHour(forecast, targetHour) {
    // Find the closest forecast entry to the target simulated hour
    const now = new Date();
    const targetTime = new Date(now);
    targetTime.setHours(Math.floor(targetHour), (targetHour % 1) * 60, 0);

    let closest = forecast[0];
    let minDiff = Infinity;
    for (const entry of forecast) {
        const diff = Math.abs(new Date(entry.datetime) - targetTime);
        if (diff < minDiff) { minDiff = diff; closest = entry; }
    }
    return closest;
}
```

---

### Module 14: Electricity Cost & Carbon Tracker (`economics.js`)

**Purpose:** Tracks real-time electricity cost using time-of-use pricing and CO₂ emissions. Provides dollar savings and carbon savings comparisons.

```javascript
class EconomicsTracker {
    constructor() {
        // Time-of-Use electricity rates ($/kWh)
        this.rates = [
            { start: 0,  end: 6,  rate: 0.05, label: 'Super Off-Peak' },
            { start: 6,  end: 14, rate: 0.08, label: 'Off-Peak' },
            { start: 14, end: 18, rate: 0.22, label: 'Peak' },
            { start: 18, end: 22, rate: 0.10, label: 'Mid-Peak' },
            { start: 22, end: 24, rate: 0.05, label: 'Super Off-Peak' }
        ];

        // Grid carbon intensity (kg CO₂ per kWh) — varies by time
        this.carbonIntensity = [
            { start: 0,  end: 6,  intensity: 0.30 },  // cleaner (less demand)
            { start: 6,  end: 10, intensity: 0.45 },
            { start: 10, end: 14, intensity: 0.40 },
            { start: 14, end: 18, intensity: 0.55 },  // dirtiest (peak demand, gas peakers)
            { start: 18, end: 22, intensity: 0.42 },
            { start: 22, end: 24, intensity: 0.30 }
        ];

        this.predictiveCost = 0;
        this.standardCost = 0;
        this.predictiveCarbon = 0;
        this.standardCarbon = 0;
    }

    getRate(hour) {
        return this.rates.find(r => hour >= r.start && hour < r.end)?.rate || 0.08;
    }

    getCarbon(hour) {
        return this.carbonIntensity.find(r => hour >= r.start && hour < r.end)?.intensity || 0.40;
    }

    update(hour, predictivePower, standardPower, dt) {
        const rate = this.getRate(hour);
        const carbon = this.getCarbon(hour);
        const dtHours = dt / 3600;

        // Convert power % to kW (assume 3.5 kW AC unit)
        const acCapacityKW = 3.5;
        const predKWh = (predictivePower / 100) * acCapacityKW * dtHours;
        const stdKWh  = (standardPower / 100) * acCapacityKW * dtHours;

        this.predictiveCost   += predKWh * rate;
        this.standardCost     += stdKWh * rate;
        this.predictiveCarbon += predKWh * carbon;
        this.standardCarbon   += stdKWh * carbon;
    }

    getSavings() {
        const costSaved = this.standardCost - this.predictiveCost;
        const carbonSaved = this.standardCarbon - this.predictiveCarbon;
        const costPercent = this.standardCost > 0 ? (costSaved / this.standardCost) * 100 : 0;
        const carbonPercent = this.standardCarbon > 0 ? (carbonSaved / this.standardCarbon) * 100 : 0;

        return {
            costSaved:      costSaved.toFixed(2),
            costPercent:    costPercent.toFixed(1),
            carbonSavedKg:  carbonSaved.toFixed(2),
            carbonPercent:  carbonPercent.toFixed(1),
            predictiveCost: this.predictiveCost.toFixed(2),
            standardCost:   this.standardCost.toFixed(2),
            annualProjection: (costSaved * 365).toFixed(0),
            treesEquivalent: (carbonSaved * 365 / 21).toFixed(1) // 1 tree absorbs ~21 kg CO₂/year
        };
    }

    reset() {
        this.predictiveCost = 0; this.standardCost = 0;
        this.predictiveCarbon = 0; this.standardCarbon = 0;
    }
}
```

---

### Module 15: Sankey Energy Flow Diagram (`sankey.js`)

**Purpose:** Renders a real-time Sankey (flow) diagram showing where heat comes from and where it goes.

```javascript
class SankeyDiagram {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
    }

    render(qPredicted, hvacPower, blindsReduction) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        ctx.clearRect(0, 0, w, h);

        const total = qPredicted.total || 1;
        const sources = [
            { label: 'Solar',     value: qPredicted.solar,     color: '#FFD700' },
            { label: 'Occupancy', value: qPredicted.occupancy, color: '#FF8C00' },
            { label: 'Envelope',  value: qPredicted.envelope,  color: '#9370DB' },
            { label: 'Humidity',  value: qPredicted.latent,    color: '#4682B4' },
            { label: 'Decay',     value: qPredicted.decay,     color: '#CD853F' }
        ];

        const sinks = [
            { label: 'HVAC Removed',     value: hvacPower * 0.05,     color: '#00CED1' },
            { label: 'Blinds Blocked',   value: blindsReduction * qPredicted.solar, color: '#2E8B57' },
            { label: 'Envelope Loss',    value: Math.max(0, -qPredicted.envelope) * 0.5, color: '#708090' },
            { label: 'Retained Heat',    value: Math.max(0, total - hvacPower * 0.05), color: '#DC143C' }
        ];

        // Draw source flows (left side)
        let yOffset = 20;
        for (const src of sources) {
            const height = Math.max(5, (src.value / total) * (h - 40));
            ctx.fillStyle = src.color;
            ctx.globalAlpha = 0.7;
            ctx.fillRect(10, yOffset, 80, height);
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#fff';
            ctx.font = '11px sans-serif';
            ctx.fillText(`${src.label}`, 15, yOffset + height/2 + 4);
            ctx.fillText(`${(src.value/total*100).toFixed(0)}%`, 60, yOffset + height/2 + 4);

            // Draw flow curve to center
            ctx.beginPath();
            ctx.moveTo(90, yOffset + height/2);
            ctx.bezierCurveTo(w/2 - 40, yOffset + height/2, w/2 - 40, h/2, w/2, h/2);
            ctx.strokeStyle = src.color;
            ctx.globalAlpha = 0.3;
            ctx.lineWidth = Math.max(1, height * 0.6);
            ctx.stroke();
            ctx.globalAlpha = 1;

            yOffset += height + 5;
        }

        // Draw center node
        ctx.fillStyle = '#333';
        ctx.fillRect(w/2 - 30, h/2 - 25, 60, 50);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('Room', w/2 - 18, h/2 + 5);

        // Draw sink flows (right side)
        yOffset = 20;
        for (const sink of sinks) {
            const height = Math.max(5, (sink.value / total) * (h - 40));
            ctx.fillStyle = sink.color;
            ctx.globalAlpha = 0.7;
            ctx.fillRect(w - 90, yOffset, 80, height);
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#fff';
            ctx.fillText(`${sink.label}`, w - 85, yOffset + height/2 + 4);
            yOffset += height + 5;
        }
    }
}
```

---

### Module 16: Historical Playback Engine (`playback.js`)

**Purpose:** Records full simulation runs to localStorage and allows scrubbing through past sessions, comparing runs side-by-side, and exporting data as CSV.

```javascript
class PlaybackEngine {
    constructor() {
        this.recordings = JSON.parse(localStorage.getItem('thermostat_recordings') || '[]');
        this.currentRecording = null;
        this.isRecording = false;
        this.isPlaying = false;
        this.playbackIndex = 0;
    }

    startRecording(metadata = {}) {
        this.currentRecording = {
            id: Date.now().toString(36),
            startedAt: new Date().toISOString(),
            metadata: metadata, // { season, weather, mode, pidParams }
            frames: []
        };
        this.isRecording = true;
    }

    recordFrame(state) {
        if (!this.isRecording) return;
        this.currentRecording.frames.push({
            t: state.simulatedHour,
            rooms: state.rooms.map(r => ({ id: r.id, tempF: r.tempF })),
            pred: { ...state.qPredicted },
            hvac: state.predictiveMode.hvacPower,
            hvacStd: state.standardMode.hvacPower,
            blinds: state.blindStates,
            weather: { temp: state.weather.outdoorTempF, cloud: state.weather.cloud },
            cost: state.economics.predictiveCost,
            costStd: state.economics.standardCost
        });
    }

    stopRecording() {
        if (!this.isRecording) return null;
        this.isRecording = false;
        this.currentRecording.endedAt = new Date().toISOString();
        this.currentRecording.frameCount = this.currentRecording.frames.length;
        this.recordings.push(this.currentRecording);

        // Persist (keep last 10 recordings)
        if (this.recordings.length > 10) this.recordings.shift();
        localStorage.setItem('thermostat_recordings', JSON.stringify(this.recordings));

        return this.currentRecording.id;
    }

    playback(recordingId) {
        const rec = this.recordings.find(r => r.id === recordingId);
        if (!rec) return null;
        this.isPlaying = true;
        this.playbackIndex = 0;
        return rec;
    }

    getFrame(index) {
        if (!this.isPlaying || !this.currentRecording) return null;
        return this.currentRecording.frames[index] || null;
    }

    exportCSV(recordingId) {
        const rec = this.recordings.find(r => r.id === recordingId);
        if (!rec) return '';
        const headers = 'Hour,RoomTemp_Predictive,RoomTemp_Standard,HVAC_Predictive,HVAC_Standard,Q_Solar,Q_Occupancy,Q_Envelope,Q_Humidity,Q_Decay,Cost_Predictive,Cost_Standard,OutdoorTemp,CloudCover\n';
        const rows = rec.frames.map(f =>
            `${f.t.toFixed(2)},${f.rooms[0]?.tempF.toFixed(1)},${f.rooms[0]?.tempF.toFixed(1)},${f.hvac},${f.hvacStd},${f.pred.solar.toFixed(3)},${f.pred.occupancy.toFixed(3)},${f.pred.envelope.toFixed(3)},${f.pred.latent.toFixed(3)},${f.pred.decay.toFixed(3)},${f.cost.toFixed(4)},${f.costStd.toFixed(4)},${f.weather.temp},${f.weather.cloud}`
        ).join('\n');
        return headers + rows;
    }

    listRecordings() {
        return this.recordings.map(r => ({
            id: r.id, startedAt: r.startedAt, frameCount: r.frameCount,
            metadata: r.metadata
        }));
    }
}
```

---

### Module 17: Simulated IoT Sensor Network (`sensors.js`)

**Purpose:** Places virtual temperature sensors at different positions in each room. Each sensor reads a slightly different temperature based on proximity to heat sources and has unique noise characteristics.

```javascript
class IoTSensorNetwork {
    constructor(rooms) {
        this.sensors = [];
        for (const room of rooms) {
            // Place 4 sensors per room
            const positions = [
                { x: room.bbox.x + 20, y: room.bbox.y + 20, label: 'Near Window' },
                { x: room.bbox.x + room.bbox.width/2, y: room.bbox.y + room.bbox.height/2, label: 'Center' },
                { x: room.bbox.x + room.bbox.width - 20, y: room.bbox.y + 20, label: 'Far Corner' },
                { x: room.bbox.x + room.bbox.width/2, y: room.bbox.y + room.bbox.height - 20, label: 'Near Door' }
            ];
            for (const pos of positions) {
                this.sensors.push({
                    id: `${room.id}_${pos.label.toLowerCase().replace(/ /g, '_')}`,
                    roomId: room.id,
                    x: pos.x, y: pos.y,
                    label: pos.label,
                    noiseLevel: 0.2 + Math.random() * 0.8, // unique sensor quality
                    lastReading: null
                });
            }
        }
    }

    readAll(rooms, heatmap, hvacPowerPerRoom) {
        const readings = [];
        for (const sensor of this.sensors) {
            const room = rooms.find(r => r.id === sensor.roomId);
            const baseTemp = room.tempF;

            // Spatial temperature variation from heatmap
            const heatmapCol = Math.floor(sensor.x / heatmap.cellSize);
            const heatmapRow = Math.floor(sensor.y / heatmap.cellSize);
            const localHeat = heatmap.grid[heatmapRow * heatmap.cols + heatmapCol] || 0;

            // Proximity to HVAC vent (cooler near vent)
            const hvacCooling = (hvacPowerPerRoom[room.id] || 0) * 0.02; // slight local cooling near vent

            // Sensor noise
            const noise = (Math.random() - 0.5) * 2 * sensor.noiseLevel;

            const reading = baseTemp + localHeat * 3 - hvacCooling + noise;
            sensor.lastReading = reading;

            readings.push({
                sensorId: sensor.id,
                roomId: sensor.roomId,
                label: sensor.label,
                x: sensor.x, y: sensor.y,
                rawReading: reading,
                noiseLevel: sensor.noiseLevel
            });
        }
        return readings;
    }
}
```

---

## 4. Dual-Axis Configuration System (Environment × Audience)

The system uses a **2×2 matrix** for configuration, combining two independent axes:
- **Environment Axis:** 🏠 Household vs 🏬 Commercial (room topology, furniture, thermal connections)
- **Audience Axis:** 💎 Premium vs 💰 Economy (controller optimization weights, comfort tolerance, cost sensitivity)

This produces **4 distinct operating modes** switchable live during the demo:

| | 🏠 Household | 🏬 Commercial |
|--|---|---|
| **💎 Premium** | Max comfort, aggressive HVAC, blinds open for light | Server room always cooled, meeting rooms pre-cooled for scheduled meetings |
| **💰 Economy** | Blinds close first, pre-cool during off-peak, ±2°F tolerance | Auto-off in empty zones, carbon tracking, lights/fans awareness |

---

### 4A. Environment Presets

#### 🏠 Household (3-Room Apartment)
- **Use Case:** Residential space. Solar heat through windows is the primary threat.
- **Layout:** Living Room (west, 400×300), Bedroom (east, 350×250), Kitchen (north, 350×250)
- **Furniture:**

| Room | Objects | Thermal Mass | Appliances |
|------|---------|-------------|------------|
| Living Room | Dark Sofa (0.90), Glass Table (0.15), Dark Rug (0.75) | High solar absorption | 3 lights, 1 fan, 1 monitor |
| Bedroom | Bed Frame (0.55), Dark Curtains (0.65) | Morning sun absorption | 2 lights, 1 fan |
| Kitchen | Granite Counter (0.70), Refrigerator (0.30) | Cooking heat retention | 2 lights, 1 fan |

- **Thermal Connections:** LR↔Bedroom (wall, 0.15), LR↔Kitchen (door, 0.60), Bedroom↔Kitchen (wall, 0.15)
- **Occupancy Params:** max 4 people, 3 baseline WiFi IoT devices, 2.0 devices/person, 30 dB base noise

#### 🏬 Commercial (Office + Server Room)
- **Use Case:** Commercial HVAC with high-occupancy and constant internal heat from servers.
- **Layout:** Open-Plan Floor (south, 700×350, 2 window banks), Glass Meeting Room (south, 250×200), Server Closet (no windows, 250×180, target 65°F)
- **Furniture:**

| Room | Objects | Thermal Mass | Special |
|------|---------|-------------|---------|
| Open Floor | 2× Desk Clusters (0.45 each), Dark Carpet (0.80), Printer (0.35) | 12 lights, 4 fans, 16 monitors |
| Meeting Room | Conference Table (0.70), Projector (0.10) | 4 lights, 1 fan, 2 monitors |
| **Server Closet** | **2× Server Racks (0.95 each, storedHeat=0.5)**, UPS Bank (0.40, storedHeat=0.2) | **1 light, 6 fans** — 24/7 heat generation |

- **Thermal Connections:** Floor↔Meeting (door, 0.60), Floor↔Server (wall, 0.15)
- **Occupancy Params:** max 25 people, 8 baseline WiFi IoT devices, 2.5 devices/person, 35 dB base noise

---

### 4B. Audience Profiles (Controller Optimization Weights)

The audience profile modifies **how aggressively** the controller optimizes. Both profiles use the same physics engine and the same controller algorithms — only the **cost function weights** change.

#### 💎 Premium (Rich Audience — Comfort-First)

| Parameter | Value | Effect |
|-----------|-------|--------|
| `tempTolerance` | ±0.5°F | Must maintain exact setpoint |
| `energyPenaltyWeight` | 0.01 | Virtually ignores electricity cost |
| `carbonPenaltyWeight` | 0.01 | Ignores carbon emissions |
| `comfortPenaltyWeight` | 5.0 | Comfort is 5× more important than cost |
| `blindsStrategy` | `'comfort'` | Keep blinds open for natural light and views |
| `blindsCloseThreshold` | 0.8 | Only close for extreme heat threats (spike > 0.8) |
| `preCoolMinutes` | 30 | Start HVAC 30 min before predicted heat arrival |
| `hvacMaxPower` | 100% | Allow full blast |
| `hvacMinResponse` | 20% | Always run at ≥20% if any deviation detected |
| `acUnitCapacityKW` | 5.0 | Larger premium AC unit installed |
| `displayCostSavings` | false | Don't show cost panel — irrelevant to this user |
| `displayComfortScore` | true | Prominently show PMV comfort gauge |

**MPC Cost Function (Premium):**
$$J_{premium} = \sum_{k=0}^{H} \left[ 5.0 \cdot (T_k - T_{target})^2 + 0.01 \cdot P_k^2 \right]$$

#### 💰 Economy (Mid-Range Audience — Cost-Efficient)

| Parameter | Value | Effect |
|-----------|-------|--------|
| `tempTolerance` | ±2.0°F | Wider acceptable comfort band |
| `energyPenaltyWeight` | 0.5 | Heavily penalizes energy consumption |
| `carbonPenaltyWeight` | 0.3 | Moderate carbon-consciousness |
| `comfortPenaltyWeight` | 1.0 | Standard comfort weight |
| `blindsStrategy` | `'efficiency'` | Close blinds aggressively to avoid using AC |
| `blindsCloseThreshold` | 0.2 | Close even for small heat threats (spike > 0.2) |
| `preCoolMinutes` | 15 | Conservative pre-cooling window |
| `hvacMaxPower` | 75% | Cap HVAC output to save energy |
| `hvacMinResponse` | 0% | Allow AC to fully turn off |
| `targetOvershoot` | 1.0°F | Allow room to be 1°F below target to save energy |
| `acUnitCapacityKW` | 3.5 | Standard AC unit |
| `displayCostSavings` | true | Show savings panel prominently |
| `displayComfortScore` | false | De-emphasize comfort gauge |

**MPC Cost Function (Economy):**
$$J_{economy} = \sum_{k=0}^{H} \left[ 1.0 \cdot (T_k - T_{target})^2 + 0.5 \cdot P_k \cdot C_{TOU}(k) + 0.3 \cdot P_k \cdot I_{carbon}(k) \right]$$

Where $C_{TOU}(k)$ is the Time-of-Use electricity price at timestep $k$ and $I_{carbon}(k)$ is the grid carbon intensity.

---

### 4C. Implementation

```javascript
// config.js — Dual-axis configuration
CONFIG.ENVIRONMENTS = {
    household:  { name: '🏠 Household', isCommercial: false, rooms: [...], connections: [...] },
    commercial: { name: '🏬 Commercial', isCommercial: true,  rooms: [...], connections: [...] }
};
CONFIG.AUDIENCE_PROFILES = {
    premium: { name: '💎 Premium', tempTolerance: 0.5, energyPenaltyWeight: 0.01, ... },
    economy: { name: '💰 Economy', tempTolerance: 2.0, energyPenaltyWeight: 0.5, ... }
};
CONFIG.ACTIVE_ENVIRONMENT = 'household';
CONFIG.ACTIVE_AUDIENCE = 'economy';

// Helper functions
function getActiveEnvironment() { return CONFIG.ENVIRONMENTS[CONFIG.ACTIVE_ENVIRONMENT]; }
function getActiveAudience() { return CONFIG.AUDIENCE_PROFILES[CONFIG.ACTIVE_AUDIENCE]; }
function isCommercialMode() { return getActiveEnvironment().isCommercial; }
function getProfileLabel() { /* returns e.g. "💎 🏬 Premium Commercial" */ }

// UI Switchers (in main.js)
document.getElementById('env-select').addEventListener('change', (e) => {
    CONFIG.ACTIVE_ENVIRONMENT = e.target.value;
    initState(); initModules(); updateProfileBadge();
});
document.getElementById('audience-select').addEventListener('change', (e) => {
    CONFIG.ACTIVE_AUDIENCE = e.target.value;
    initState(); initModules(); updateProfileBadge();
});
```

### HTML Dropdowns
```html
<select id="env-select">
    <option value="household" selected>🏠 Household (Apartment)</option>
    <option value="commercial">🏬 Commercial (Office)</option>
</select>
<select id="audience-select">
    <option value="premium">💎 Premium (Comfort-First)</option>
    <option value="economy" selected>💰 Economy (Cost-Efficient)</option>
</select>
<div id="profile-badge" class="profile-badge">💰 🏠 Economy Household</div>
```

---

---




---



- **Use Case:** Multi-zone residential. Demonstrates inter-room thermal diffusion and per-zone independent control.
- **Layout:**
  - **Living Room** — west-facing, 400×300px, 1 window
  - **Bedroom** — east-facing, 350×250px, 1 window
  - **Kitchen** — north-facing, 350×250px, 1 window
- **Furniture:**

| Room | Objects | Notable Thermal Mass |
|------|---------|---------------------|
| Living Room | Dark Sofa (0.90), Glass Table (0.15), Dark Rug (0.75) | Sofa is primary heat sink |
| Bedroom | Bed Frame (0.55), Dark Curtains (0.65) | Curtains absorb morning sun |
| Kitchen | Granite Counter (0.70), Refrigerator (0.30) | Granite stores cooking heat |

- **Thermal Connections:**

| Connection | Type | Conductance | Effect |
|-----------|------|------------|--------|
| Living Room ↔ Bedroom | Shared wall | 0.15 (low) | Slow heat bleed through drywall |
| Living Room ↔ Kitchen | Open doorway | 0.60 (high) | Rapid air mixing when door open |
| Bedroom ↔ Kitchen | Shared wall | 0.15 (low) | Slow heat bleed |

- **Demo Story:** *"Heat enters the living room via the west-facing window. Watch the heatmap show it slowly diffusing through the wall into the bedroom. The AI cools only the affected zones."*

---

### Preset 3: 🏬 Business Office (Open Plan + Server Room)
- **Use Case:** Commercial HVAC with high-occupancy stochastic modeling and **constant internal heat sources** (servers). This is the hardest challenge for the AI.
- **Layout:**
  - **Open-Plan Floor** — south-facing, 700×350px, 2 large window banks (300px each)
  - **Glass Meeting Room** — south-facing, 250×200px, 1 window
  - **Server Closet** — no windows, 250×180px, target temp 65°F (critical!)
- **Furniture:**

| Room | Objects | Thermal Mass | Special Property |
|------|---------|-------------|-----------------|
| Open Floor | 2× Desk Clusters (16 desks) | 0.45 each | High occupancy heat |
| Open Floor | Dark Office Carpet | 0.80 | Massive floor-level heat trap |
| Open Floor | Printer & Copier | 0.35 | Intermittent internal heat source |
| Meeting Room | Conference Table | 0.70 | Absorbs afternoon sun deeply |
| Meeting Room | Ceiling Projector | 0.10 | Negligible |
| **Server Closet** | **2× Server Racks** | **0.95 each** | **Pre-loaded storedHeat = 0.5 (24/7 heat generation!)** |
| **Server Closet** | **UPS Battery Bank** | **0.40** | **Pre-loaded storedHeat = 0.2** |

- **Thermal Connections:**

| Connection | Type | Effect |
|-----------|------|--------|
| Open Floor ↔ Meeting Room | Glass door | Rapid air mixing (0.60) |
| Open Floor ↔ Server Room | Insulated wall | Slow heat leakage (0.15) — but servers generate constant internal heat |

- **Critical Challenge:** The server room has **no windows** and **no solar input**, but generates heat 24/7 from the server racks (storedHeat is pre-loaded). The AI must keep it at 65°F or the servers overheat. This means the HVAC must run in the server room even when the rest of the office is comfortable.
- **Demo Story:** *"This is a real-world commercial challenge. The server room generates heat 24/7 — no sun needed. The AI must simultaneously cool the sun-blasted open floor AND the server closet, with different strategies for each zone."*

---

### Environment Switching Implementation

```javascript
// In config.js — All 3 presets stored in CONFIG.ENVIRONMENTS
CONFIG.ENVIRONMENTS = {
    room:     { name: '🏠 Single Room', rooms: [...], connections: [] },
    building: { name: '🏢 Residential',  rooms: [...], connections: [...] },
    office:   { name: '🏬 Office',       rooms: [...], connections: [...] }
};
CONFIG.ACTIVE_ENVIRONMENT = 'building'; // default

// Helper functions (global)
function getActiveEnvironment() {
    return CONFIG.ENVIRONMENTS[CONFIG.ACTIVE_ENVIRONMENT];
}
function getActiveRooms() {
    return JSON.parse(JSON.stringify(getActiveEnvironment().rooms)); // Deep copy
}
function getActiveConnections() {
    return getActiveEnvironment().connections;
}

// UI Switcher Event (in main.js)
document.getElementById('env-select').addEventListener('change', (e) => {
    CONFIG.ACTIVE_ENVIRONMENT = e.target.value;
    initState();   // Re-initialize all room state from new preset
    initModules(); // Re-create controller instances for new window count
    console.log(`Switched to: ${getActiveEnvironment().name}`);
});
```

### HTML Dropdown (in index.html control panel)
```html
<div class="control-group">
    <label>Environment:</label>
    <select id="env-select">
        <option value="room">🏠 Single Room (Studio)</option>
        <option value="building" selected>🏢 Residential (3-Room)</option>
        <option value="office">🏬 Business Office</option>
    </select>
</div>
```

---

## 5. Expanded File Structure

```
climate-thermostat/
│
├── index.html                  # Single HTML page, all CDN imports
├── style.css                   # Layout, dark theme, dashboard grid
│
├── js/
│   ├── main.js                 # Entry point, game loop, initialization
│   ├── config.js               # All constants, room definitions, PID tuning params
│   │
│   │── [SIMULATION ENGINE]
│   ├── renderer.js             # Canvas drawing (rooms, furniture, rays, heatmap, sensors)
│   ├── sun.js                  # Sun orbital path, seasonal declination, ray generation, forecast
│   ├── collision.js            # AABB / 3D intersection tests (Virtual CV Layer)
│   ├── heatmap.js              # Thermal heatmap generator (pixel-level diffusion)
│   ├── physics.js              # Multi-room temperature update with inter-room diffusion
│   │
│   │── [INTELLIGENCE]
│   ├── predictor.js            # Q_predicted calculator (Solar + Occupancy + Envelope + Humidity + Decay)
│   ├── occupancy.js            # Stochastic occupancy model
│   ├── controller.js           # PID+FF, MPC, RL Agent, Self-Tuner
│   ├── bangbang.js             # Standard thermostat baseline controller
│   ├── blinds.js               # Smart blind controller (first-response actuator)
│   ├── kalman.js               # Kalman filter for multi-sensor fusion
│   ├── anomaly.js              # Anomaly detection & fault diagnosis
│   ├── calibration.js          # Digital twin self-calibration engine
│   │
│   │── [DATA & API]
│   ├── weather.js              # WeatherAPI client (current + 3-day forecast + cloud cover)
│   ├── economics.js            # Electricity cost + carbon CO₂ tracker
│   ├── sensors.js              # Simulated IoT sensor network
│   │
│   │── [VISUALIZATION]
│   ├── dashboard.js            # Chart.js graphs (temp, power, energy, Q breakdown, comfort)
│   ├── sankey.js               # Sankey energy flow diagram
│   ├── playback.js             # Historical recording, playback, CSV export
│   └── controls.js             # UI control event listeners
│
└── assets/
    └── (icons, fonts)
```

**Total Files:** 1 HTML + 1 CSS + 22 JS modules = **24 files, zero build step, zero npm.**

---

## 6. Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Rendering | HTML5 Canvas 2D / Three.js (WebGL for 3D mode) | Full pixel control + optional photorealistic 3D. |
| Language | Vanilla JavaScript (ES6+) | No build step, instant reload. |
| Styling | CSS3 (Grid + Flexbox) | Dark theme dashboard. |
| Charts | Chart.js (CDN) | Animated graphs, zero config. |
| Weather | WeatherAPI.com (Free) | Current + 3-day hourly forecast + cloud cover. |
| Carbon | ElectricityMaps / WattTime API | Real-time grid carbon intensity. |
| Storage | localStorage | Session recordings for playback. |
| Hosting | GitHub Pages / Vercel | Free, instant deploy. |

---

## 7. Feature Dependency Matrix

| Feature | Depends On | Enhances |
|---------|-----------|----------|
| Seasonal Sun Path | Sun Engine | Collision Detector, MPC |
| Cloud Attenuation | Weather API | Sun Engine, Q_predicted |
| 3-Day Forecast | Weather API | MPC Controller |
| Stochastic Occupancy | — | Q_predicted |
| Humidity/Latent Load | Weather API | Q_predicted |
| Thermal Decay | Collision Detector | Q_predicted, Heatmap |
| Multi-Room | Physics Engine | Zone Control |
| Inter-Room Diffusion | Multi-Room | Physics accuracy |
| Thermal Heatmap | Collision + Decay | Renderer, IoT Sensors |
| Smart Blinds | Forecast Panel | HVAC reduction |
| Kalman Filter | IoT Sensors | Anomaly Detector |
| Anomaly Detection | Kalman Filter | Diagnostics Panel |
| Self-Calibration | Physics Engine | C_thermal accuracy |
| MPC Controller | Forecast + Physics | Optimal HVAC scheduling |
| RL Agent | All state data | Autonomous optimization |
| Self-Tuning PID | Physics Engine | PID accuracy |
| Cost Tracker | Economics module | Dashboard |
| Carbon Tracker | Economics module | Dashboard |
| Sankey Diagram | Q_predicted | Dashboard |
| Playback Engine | Data Logger | Analytics |
| Forecast Panel | Sun Engine + Collision | Smart Blinds, MPC |

---

## 8. Bang-Bang Baseline Controller (`bangbang.js`)

**Purpose:** Implements the industry-standard reactive thermostat for side-by-side comparison. This is the "control group" to prove how much better the PID+FF/MPC approach is.

```javascript
class BangBangController {
    constructor(threshold, hysteresis = 1.0) {
        this.threshold = threshold;   // e.g., 75°F
        this.hysteresis = hysteresis; // dead band to prevent rapid cycling
        this.isOn = false;
    }

    compute(currentTemp) {
        if (!this.isOn && currentTemp > this.threshold) {
            this.isOn = true;
        } else if (this.isOn && currentTemp < this.threshold - this.hysteresis) {
            this.isOn = false;
        }
        return this.isOn ? 100 : 0; // 100% or 0%, nothing in between
    }

    reset() { this.isOn = false; }
}
```

---

## 9. Dashboard & Charts Module (`dashboard.js`)

**Purpose:** Records time-series data from both modes (Standard vs Predictive) every frame and renders live comparison charts using Chart.js.

**Data Streams Logged:**

| Data Point | Source | Chart Type |
|---|---|---|
| Room Temperature (°F) per room | Physics Engine | Multi-line (Standard vs Predictive per room) |
| HVAC Power Output (%) per zone | Controller | Area chart (dual) |
| Cumulative Energy (kWh) | ΣPower × dt | Bar chart (side-by-side) |
| Cumulative Cost (\$) | Economics Tracker | Bar chart |
| CO₂ Emissions (kg) | Economics Tracker | Bar chart |
| Q_predicted Breakdown | Predictor | Stacked area (Solar/Occupancy/Envelope/Humidity/Decay) |
| Comfort Score (PMV) | Physics + Occupancy | Gauge chart |
| Sensor Readings | IoT Network | Multi-line sparklines |
| Kalman Estimate vs Raw | Kalman Filter | Line with uncertainty band |
| Blind States | Blind Controller | Timeline bar |

**Chart Initialization:**
```javascript
function initCharts() {
    const tempChart = new Chart(document.getElementById('tempChart'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                { label: 'Predictive Mode', borderColor: '#00CED1', data: [], tension: 0.3 },
                { label: 'Standard Mode', borderColor: '#DC143C', data: [], tension: 0.3 },
                { label: 'Target', borderColor: '#2ECC71', borderDash: [5, 5], data: [] }
            ]
        },
        options: {
            responsive: true,
            animation: { duration: 0 },
            scales: { y: { min: 65, max: 85, title: { display: true, text: '°F' } } }
        }
    });

    const powerChart = new Chart(document.getElementById('powerChart'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                { label: 'Predictive', backgroundColor: 'rgba(0,206,209,0.3)', borderColor: '#00CED1', fill: true, data: [] },
                { label: 'Standard', backgroundColor: 'rgba(220,20,60,0.3)', borderColor: '#DC143C', fill: true, data: [] }
            ]
        },
        options: {
            responsive: true,
            animation: { duration: 0 },
            scales: { y: { min: 0, max: 100, title: { display: true, text: 'Power %' } } }
        }
    });

    const energyChart = new Chart(document.getElementById('energyChart'), {
        type: 'bar',
        data: {
            labels: ['Predictive', 'Standard'],
            datasets: [{ data: [0, 0], backgroundColor: ['#00CED1', '#DC143C'] }]
        }
    });

    const qChart = new Chart(document.getElementById('qChart'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                { label: 'Solar', backgroundColor: 'rgba(255,215,0,0.4)', borderColor: '#FFD700', fill: true, data: [] },
                { label: 'Occupancy', backgroundColor: 'rgba(255,140,0,0.4)', borderColor: '#FF8C00', fill: true, data: [] },
                { label: 'Envelope', backgroundColor: 'rgba(147,112,219,0.4)', borderColor: '#9370DB', fill: true, data: [] },
                { label: 'Humidity', backgroundColor: 'rgba(70,130,180,0.4)', borderColor: '#4682B4', fill: true, data: [] },
                { label: 'Decay', backgroundColor: 'rgba(205,133,63,0.4)', borderColor: '#CD853F', fill: true, data: [] }
            ]
        },
        options: { responsive: true, animation: { duration: 0 }, scales: { x: {stacked: true}, y: {stacked: true} } }
    });

    return { tempChart, powerChart, energyChart, qChart };
}

function updateCharts(charts, history, economics) {
    const maxPoints = 500;
    if (history.timestamps.length > maxPoints) {
        for (const key of Object.keys(history)) {
            history[key] = history[key].slice(-maxPoints);
        }
    }

    // Update temperature chart
    charts.tempChart.data.labels = history.timestamps;
    charts.tempChart.data.datasets[0].data = history.predictiveTempF;
    charts.tempChart.data.datasets[1].data = history.standardTempF;
    charts.tempChart.data.datasets[2].data = history.targetTempF;
    charts.tempChart.update();

    // Update power chart
    charts.powerChart.data.labels = history.timestamps;
    charts.powerChart.data.datasets[0].data = history.predictivePower;
    charts.powerChart.data.datasets[1].data = history.standardPower;
    charts.powerChart.update();

    // Update energy bars
    charts.energyChart.data.datasets[0].data = [
        economics.predictiveCost, economics.standardCost
    ];
    charts.energyChart.update();

    // Update Q breakdown
    charts.qChart.data.labels = history.timestamps;
    charts.qChart.data.datasets[0].data = history.qSolar;
    charts.qChart.data.datasets[1].data = history.qOccupancy;
    charts.qChart.data.datasets[2].data = history.qEnvelope;
    charts.qChart.data.datasets[3].data = history.qHumidity;
    charts.qChart.data.datasets[4].data = history.qDecay;
    charts.qChart.update();
}
```

---

## 10. Control Panel UI (`controls.js`)

**Purpose:** Provides interactive controls for the hackathon demo.

**UI Controls:**

| Control | Type | Effect |
|---|---|---|
| Mode Toggle | Switch | Cycles: "Standard (Bang-Bang)" → "Predictive (PID+FF)" → "MPC" → "RL Agent" |
| Time Speed | Slider (1×–120×) | Controls simulation speed |
| Occupancy Override | Number input (0–10) | Overrides stochastic model with manual count |
| Target Temp | Slider (65–80°F) | Sets the HVAC setpoint for all zones |
| Season | Dropdown (Spring/Summer/Fall/Winter) | Sets day-of-year for seasonal sun path |
| Sun Override | Slider (6AM–6PM) | Manually position the sun for demo |
| Blind Control | Per-window toggle (Open/Half/Closed) | Manual or Auto mode |
| Calibration | Button | Starts/stops the digital twin calibration cycle |
| Playback | Button group (Record/Stop/Play/Export) | Historical recording controls |
| Reset | Button | Resets simulation to 6:00 AM, room at 72°F |
| Side-by-Side | Toggle | Runs BOTH modes simultaneously for live comparison |

```javascript
function initControls(state) {
    document.getElementById('modeToggle').addEventListener('change', (e) => {
        state.activeMode = e.target.value; // 'standard' | 'pidff' | 'mpc' | 'rl'
    });

    document.getElementById('timeSpeed').addEventListener('input', (e) => {
        state.simulationSpeed = parseInt(e.target.value);
        document.getElementById('speedLabel').textContent = `${state.simulationSpeed}×`;
    });

    document.getElementById('occupancy').addEventListener('input', (e) => {
        state.occupancyOverride = parseInt(e.target.value);
    });

    document.getElementById('targetTemp').addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        state.targetTempF = val;
        for (const room of state.rooms) room.targetTempF = val;
        document.getElementById('targetLabel').textContent = `${val}°F`;
    });

    document.getElementById('season').addEventListener('change', (e) => {
        const seasons = { spring: 80, summer: 172, fall: 266, winter: 355 };
        state.dayOfYear = seasons[e.target.value];
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
        resetSimulation(state);
    });

    document.getElementById('compareToggle').addEventListener('change', (e) => {
        state.comparisonMode = e.target.checked;
    });

    document.getElementById('calibrateBtn').addEventListener('click', () => {
        if (state.calibrator.isCalibrating) {
            const result = state.calibrator.runCalibration();
            console.log('Calibration result:', result);
        } else {
            state.calibrator.startCalibration();
        }
    });
}
```

---

## 11. Simulation State Schema (In-Memory Store)

All simulation state lives in a single JavaScript object, updated every `requestAnimationFrame` tick:

```javascript
const simulationState = {
    // Time
    simulatedHour:      6.0,
    simulationSpeed:    10,
    dayOfYear:          172,        // June 21 (summer solstice)
    latitude:           19.07,      // Mumbai, India
    frameCount:         0,
    dtSeconds:          0,

    // Sun
    sun: {
        elevation:      0,
        azimuth:        0,
        intensity:      0,
        rays:           [],
        cloudCover:     0           // from API
    },

    // Rooms (multi-zone)
    rooms:              ROOMS,      // from config.js
    connections:        ROOM_CONNECTIONS,

    // Intersections & Heatmap
    intersections:      [],
    heatmap:            null,       // ThermalHeatmap instance

    // Controllers
    predictiveMode: {
        roomTemps:      {},         // { roomId: tempF }
        hvacPower:      {},         // { roomId: power% }
        totalEnergy:    0,
        controller:     null        // FeedForwardPIDController | MPC | RLAgent
    },
    standardMode: {
        roomTemps:      {},
        hvacPower:      {},
        totalEnergy:    0,
        controller:     null        // BangBangController
    },

    // Prediction
    qPredicted: {
        total: 0, solar: 0, occupancy: 0,
        envelope: 0, latent: 0, decay: 0
    },

    // Forecast
    forecast: {
        threats:        [],         // from forecastThreats()
        weatherHourly:  []          // 3-day hourly from API
    },

    // Smart Blinds
    blindController:    null,       // SmartBlindController instance
    blindCommands:      [],

    // Sensors & Kalman
    sensorNetwork:      null,       // IoTSensorNetwork instance
    sensorReadings:     [],
    kalmanFusion:       null,       // MultiSensorFusion instance
    fusedEstimate:      { estimate: 72, uncertainty: 0.5 },

    // Anomaly Detection
    anomalyDetector:    null,       // AnomalyDetector instance
    activeAlerts:       [],

    // Calibration
    calibrator:         null,       // DigitalTwinCalibrator instance

    // Occupancy
    occupancyModel:     null,       // StochasticOccupancyModel instance
    occupancyOverride:  null,       // manual override (null = use stochastic model)

    // Economics
    economics:          null,       // EconomicsTracker instance

    // Playback
    playbackEngine:     null,       // PlaybackEngine instance

    // Controls
    targetTempF:        72.0,
    activeMode:         'pidff',    // 'standard' | 'pidff' | 'mpc' | 'rl'
    comparisonMode:     true,

    // Weather (from API)
    weather: {
        outdoorTempC:   35, outdoorTempF: 95,
        humidity:       60, cloud: 0,
        condition:      'Sunny', uv: 8,
        lastFetched:    null
    },

    // Data history (for charts)
    history: {
        timestamps:         [],
        predictiveTempF:    [],
        standardTempF:      [],
        predictivePower:    [],
        standardPower:      [],
        targetTempF:        [],
        qPredictedTotal:    [],
        qSolar:             [],
        qOccupancy:         [],
        qEnvelope:          [],
        qHumidity:          [],
        qDecay:             [],
        comfortScores:      [],
        blindStates:        []
    }
};
```

---

## 12. Main Simulation Loop (`main.js`)

The `requestAnimationFrame` game loop ties every module together:

```javascript
function simulationTick(timestamp) {
    // 1. Calculate delta time
    state.dtSeconds = calculateDt(timestamp, state.simulationSpeed);
    state.simulatedHour += state.dtSeconds / 3600;
    if (state.simulatedHour >= 24) state.simulatedHour -= 24;

    // 2. Update Sun (with seasonal declination and cloud cover)
    const sunAngles = getSunAngle(state.simulatedHour, state.dayOfYear, state.latitude);
    state.sun.elevation = sunAngles.elevation;
    state.sun.azimuth = sunAngles.azimuth;
    state.sun.intensity = getSunIntensity(state.simulatedHour, state.weather.cloud);
    state.sun.rays = generateSunRays(sunAngles, getAllWindows(state.rooms));

    // 3. Virtual CV: Detect collisions across all rooms
    state.intersections = detectAllIntersections(state.sun.rays, getAllObjects(state.rooms));

    // 4. Thermal Heatmap: Inject heat and diffuse
    state.heatmap.injectHeat(getAllObjects(state.rooms), state.intersections);
    state.heatmap.diffuse();

    // 5. Forecast threats (every 30 frames to save compute)
    if (state.frameCount % 30 === 0) {
        state.forecast.threats = forecastThreats(
            state.simulatedHour, getAllObjects(state.rooms), getAllWindows(state.rooms)
        );
    }

    // 6. Smart Blinds: Evaluate and apply
    state.blindCommands = state.blindController.evaluate(
        state.forecast.threats, state.qPredicted, state.rooms
    );
    applyBlindCommands(state.rooms, state.blindCommands);

    // 7. Occupancy (stochastic or manual override)
    const nPeople = state.occupancyOverride ?? state.occupancyModel.getExpectedOccupancy(state.simulatedHour);

    // 8. Calculate Q_predicted (all 5 vectors)
    state.qPredicted = calculateQPredicted(
        state.intersections, state.sun.intensity,
        state.occupancyModel, state.weather, state.rooms, state.dtSeconds
    );

    // 9. IoT Sensors → Kalman Filter
    state.sensorReadings = state.sensorNetwork.readAll(
        state.rooms, state.heatmap, state.predictiveMode.hvacPower
    );
    state.fusedEstimate = state.kalmanFusion.fuseMeasurements(state.rooms[0].tempF);

    // 10A. Predictive Mode Controller
    for (const room of state.rooms) {
        const roomQ = calculateRoomQ(state.qPredicted, room.id);
        if (state.activeMode === 'pidff') {
            state.predictiveMode.hvacPower[room.id] = state.predictiveMode.controller.compute(
                room.tempF, room.targetTempF, roomQ, state.dtSeconds
            );
        } else if (state.activeMode === 'mpc') {
            state.predictiveMode.hvacPower[room.id] = state.predictiveMode.mpcController.compute(
                room.tempF, room.targetTempF, state.simulatedHour,
                state.rooms, getAllObjects(state.rooms), getAllWindows(state.rooms),
                state.weather, state.dtSeconds
            );
        }
    }

    // 10B. Standard Mode: Bang-Bang (runs in parallel for comparison)
    for (const room of state.rooms) {
        state.standardMode.hvacPower[room.id] = state.standardMode.controller.compute(room.tempF);
    }

    // 11. Physics: Update temperatures (multi-room with diffusion)
    updateMultiRoomTemperatures(
        state.rooms, state.connections,
        state.predictiveMode.hvacPower,  // for predictive
        state.dtSeconds
    );

    // 12. Anomaly Detection
    const alert = state.anomalyDetector.check(
        state.fusedEstimate.estimate, state.rooms[0].tempF,
        state.predictiveMode.hvacPower[state.rooms[0].id],
        state.qPredicted, state.weather
    );
    if (alert) state.activeAlerts.push(alert);

    // 13. Calibration (if active)
    if (state.calibrator.isCalibrating) {
        state.calibrator.recordObservation(
            state.fusedEstimate.estimate, state.rooms[0].tempF, state.intersections
        );
    }

    // 14. Economics: Track cost and carbon
    for (const room of state.rooms) {
        state.economics.update(
            state.simulatedHour,
            state.predictiveMode.hvacPower[room.id] || 0,
            state.standardMode.hvacPower[room.id] || 0,
            state.dtSeconds
        );
    }

    // 15. Log data for charts
    logDataPoint(state);

    // 16. Playback recording
    if (state.playbackEngine.isRecording) {
        state.playbackEngine.recordFrame(state);
    }

    // 17. Render everything
    render(ctx, state);
    updateCharts(charts, state.history, state.economics);
    updateSankey(sankeyDiagram, state.qPredicted, state.predictiveMode.hvacPower, state.blindCommands);
    updateForecastPanel(state.forecast.threats);
    updateAnomalyPanel(state.activeAlerts);
    updateSensorPanel(state.sensorReadings, state.fusedEstimate);
    updateSavingsPanel(state.economics.getSavings());

    // 18. Next frame
    state.frameCount++;
    requestAnimationFrame(simulationTick);
}
```

---

## 13. PID Tuning Constants (Recommended Starting Point)

| Constant | Value | Rationale |
|----------|-------|-----------|
| $K_p$    | 3.0   | Moderate proportional gain; reacts to current error without overshooting. |
| $K_i$    | 0.05  | Very low integral gain to slowly eliminate steady-state error over time. |
| $K_d$    | 1.5   | Dampens rapid temperature swings; prevents oscillation. |
| $K_{ff}$ | 2.0   | Aggressive feed-forward; prioritizes prediction over reaction. |

> [!WARNING]
> If the PID controller oscillates wildly or the temperature diverges to infinity, **start with very conservative values**: $K_p = 1.0$, $K_i = 0.01$, $K_d = 0.5$, $K_{ff} = 1.0$. Increase $K_{ff}$ gradually until the predictive mode visibly pre-cools. Use the Self-Tuning PID module to optimize automatically.

---

## 14. Demo Script (For Judges)

> **Step 1 — "This is the problem."**
> Show the Standard Mode. Run the simulation at 30×. Watch the room heat up to 78°F before the AC blasts at 100%. Point at the energy spike on the power chart. Show the Sankey diagram: all heat flows to "Retained Heat" because the Bang-Bang controller is too slow.

> **Step 2 — "This is our solution."**
> Toggle to Predictive Mode (PID+FF). Reset. Run the same simulation. Watch the smart blinds close automatically before the sun hits the sofa. Watch the AC engage at 15% power the moment Q_predicted spikes. The room never exceeds 73°F. The energy graph stays flat.

> **Step 3 — "Here's the intelligence stack."**
> Show the Predictive Forecast Panel counting down: "Sun hits Dark Sofa in 12 minutes." Show Q_predicted breakdown chart with all 5 vectors (Solar, Occupancy, Envelope, Humidity, Decay). Show the Kalman Filter fusing noisy sensor readings into a clean estimate with uncertainty bands.

> **Step 4 — "Here's the real-world impact."**
> Show the Economics Panel: "Predictive Mode saved \$2.47 today. Annual projection: \$900/year." Show CO₂: "Avoided 1.2 kg CO₂ today, equivalent to planting 21 trees." Show the multi-room heatmap — thermal diffusion flowing between rooms.

> **Step 5 — "Here's the self-learning."**
> Toggle to MPC mode. Show how the controller looks 60 minutes ahead and optimizes the entire schedule. Mention the RL Agent and Self-Tuning PID for autonomous long-term optimization. Show the Calibration Mode where the digital twin learns the room's thermal properties.

> **Step 6 — "And it's all in-browser."**
> Remind judges: Zero dependencies. Zero servers. 24 JS files. HTML5 Canvas. Runs on any laptop. Deployable to GitHub Pages in 30 seconds. Show the live Weather API badge responding to real outdoor conditions right now.

---

## 15. Complete Feature Verification Checklist

| # | Feature Requested | Module | Code Class/Function | Status |
|---|---|---|---|---|
| 1 | Self-Tuning PID (Gradient Descent) | controller.js (7C) | `SelfTuningPID` | ✅ |
| 2 | Model Predictive Control (MPC) | controller.js (7B) | `ModelPredictiveController` | ✅ |
| 3 | Reinforcement Learning Agent | controller.js (7D) | `RLAgent` | ✅ |
| 4 | Kalman Filter | kalman.js (M9) | `KalmanFilter`, `MultiSensorFusion` | ✅ |
| 5 | Anomaly Detection & Fault Diagnosis | anomaly.js (M10) | `AnomalyDetector` | ✅ |
| 8 | Seasonal Adaptation Engine | sun.js (M2) | `getSunAngle(hour, dayOfYear, lat)` | ✅ |
| 9 | Humidity & Latent Heat Modeling | predictor.js (M5) | Vector 4: `latentLoad` | ✅ |
| 10 | Multi-Room Zone Control | physics.js (M11) | `updateMultiRoomTemperatures()` | ✅ |
| 11 | Thermal Diffusion Between Rooms | physics.js (M11) | `ROOM_CONNECTIONS`, diffusion calc | ✅ |
| 12 | 3D Raytracing Upgrade | collision.js (M3) | `detect3DIntersections()` + Three.js | ✅ |
| 13 | Thermal Heatmap Overlay | heatmap.js (M4) | `ThermalHeatmap` | ✅ |
| 14 | Sankey Energy Flow Diagram | sankey.js (M15) | `SankeyDiagram` | ✅ |
| 15 | Historical Playback & Analytics | playback.js (M16) | `PlaybackEngine` | ✅ |
| 18 | Simulated IoT Sensor Network | sensors.js (M17) | `IoTSensorNetwork` | ✅ |
| 21 | Digital Twin Calibration Mode | calibration.js (M12) | `DigitalTwinCalibrator` | ✅ |
| 22 | Stochastic Occupancy Modeling | occupancy.js (M6) | `StochasticOccupancyModel` | ✅ |
| 23 | Weather Forecast Integration | weather.js (M13) | `fetchHourlyForecast()` | ✅ |
| T1 | Predictive Forecast Panel | sun.js (M2) | `forecastThreats()` | ✅ |
| T2 | Thermal Heatmap Overlay | heatmap.js (M4) | Same as #13 | ✅ |
| T3 | Electricity Cost + Carbon Tracker | economics.js (M14) | `EconomicsTracker` | ✅ |
| T4 | Cloud Cover Integration | sun.js (M2) | `getSunIntensity(hour, cloud)` | ✅ |
| T5 | Smart Blind Control | blinds.js (M8) | `SmartBlindController` | ✅ |
| T6 | Multi-Environment Presets (Household/Commercial) | config.js, main.js, controls.js | `CONFIG.ENVIRONMENTS`, `getActiveEnvironment()` | ✅ |
| T7 | Audience Profiles (Premium/Economy) | config.js, main.js, controller.js, blinds.js | `CONFIG.AUDIENCE_PROFILES`, `getActiveAudience()` | ✅ |
| T8 | Multi-Signal Occupancy Fusion (WiFi/Noise/Lights/Fans) | occupancy.js | `StochasticOccupancyModel.fuseOccupancy()` | ✅ |

---

## 16. HTML Structure (`index.html`)

This structure sets up the dashboard grid layout, including the primary visualization canvas, charts, control panels, and the necessary external library imports via CDNs.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Predictive Digital Twin - Climate Adaptive Smart Thermostat</title>
    <link rel="stylesheet" href="style.css">
    <!-- Chart.js for data visualization -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <!-- Three.js for 3D environment engine -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
</head>
<body>
    <header class="app-header">
        <h1>Predictive Digital Twin HVAC System</h1>
        <div id="weather-badge" class="weather-badge">Loading Weather...</div>
    </header>

    <div class="dashboard-grid">
        <!-- Main Simulation View -->
        <main class="sim-view">
            <div class="canvas-container">
                <canvas id="sim-canvas" width="1200" height="700"></canvas>
            </div>
            
            <div class="forecast-panel" id="forecast-panel">
                <h3>Predictive Forecast</h3>
                <ul id="threat-list"></ul>
            </div>
            
            <div class="sensor-panel" id="sensor-panel">
                <h3>IoT Sensor Network & Fused Estimate</h3>
                <div id="sensor-readings"></div>
                <div id="fused-estimate"></div>
            </div>
        </main>

        <!-- Controls and Real-time Analytics -->
        <aside class="sidebar-right">
            <section class="control-panel">
                <h3>System Controls</h3>
                <div class="control-group">
                    <label>Mode:</label>
                    <select id="mode-select">
                        <option value="bangbang">Standard (Bang-Bang)</option>
                        <option value="pidff" selected>Predictive (PID + FF)</option>
                        <option value="mpc">MPC (60m Lookahead)</option>
                        <option value="rl">RL Agent (Auto)</option>
                    </select>
                </div>
                <div class="control-group">
                    <label>Time Speed:</label>
                    <input type="range" id="time-speed" min="1" max="100" value="30">
                </div>
                <div class="control-group">
                    <button id="reset-btn">Reset Simulation</button>
                    <button id="calibrate-btn">Self-Calibrate Room</button>
                </div>
            </section>

            <section class="charts-panel">
                <h3>Live Analytics</h3>
                <canvas id="temp-chart" width="400" height="200"></canvas>
                <canvas id="power-chart" width="400" height="200"></canvas>
            </section>
            
            <section class="sankey-panel">
                <h3>Energy Flow</h3>
                <div id="sankey-container"></div>
            </section>

            <section class="economics-panel">
                <h3>Savings & Carbon Tracking</h3>
                <div id="savings-display">$0.00 saved</div>
                <div id="carbon-display">0 kg CO₂ avoided</div>
            </section>
            
            <section class="anomaly-panel" id="anomaly-panel">
                <h3>System Alerts</h3>
                <ul id="anomaly-list"></ul>
            </section>
        </aside>
    </div>

    <!-- Core Configurations -->
    <script src="js/config.js"></script>
    <script src="js/utils.js"></script>

    <!-- Simulation Engine Layer -->
    <script src="js/renderer.js"></script>
    <script src="js/sun.js"></script>
    <script src="js/collision.js"></script>
    <script src="js/physics.js"></script>
    <script src="js/heatmap.js"></script>
    
    <!-- Intelligence Layer -->
    <script src="js/predictor.js"></script>
    <script src="js/occupancy.js"></script>
    <script src="js/controller.js"></script>
    <script src="js/blinds.js"></script>
    <script src="js/kalman.js"></script>
    <script src="js/anomaly.js"></script>
    
    <!-- Data & API Layer -->
    <script src="js/weather.js"></script>
    <script src="js/calibration.js"></script>
    <script src="js/sankey.js"></script>
    <script src="js/playback.js"></script>
    <script src="js/economics.js"></script>
    <script src="js/sensors.js"></script>
    
    <!-- Entry Point -->
    <script src="js/main.js"></script>
</body>
</html>
```

---

## 17. CSS Layout (`style.css`)

A dark-themed, responsive CSS Grid layout that emphasizes the main simulation view while providing clear, organized side panels.

```css
:root {
    --bg-color: #121212;
    --panel-bg: #1e1e1e;
    --text-main: #e0e0e0;
    --accent: #00e5ff;
    --danger: #ff5252;
    --warning: #ffd740;
    --success: #69f0ae;
    --border: #333333;
}

body {
    margin: 0;
    padding: 0;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: var(--bg-color);
    color: var(--text-main);
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
}

.app-header {
    background-color: var(--panel-bg);
    padding: 10px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border);
}

.app-header h1 {
    margin: 0;
    font-size: 1.5rem;
    color: var(--accent);
}

.weather-badge {
    background: #333;
    padding: 5px 10px;
    border-radius: 4px;
    font-weight: bold;
}

.dashboard-grid {
    display: grid;
    grid-template-columns: 1fr 400px;
    flex-grow: 1;
    overflow: hidden;
}

.sim-view {
    position: relative;
    padding: 15px;
    display: flex;
    flex-direction: column;
    gap: 15px;
    overflow-y: auto;
}

.canvas-container {
    background: #000;
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
}

.forecast-panel, .sensor-panel {
    background: var(--panel-bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 15px;
}

.forecast-panel h3, .sensor-panel h3 {
    margin-top: 0;
    color: var(--warning);
}

.sidebar-right {
    background: var(--panel-bg);
    border-left: 1px solid var(--border);
    padding: 15px;
    display: flex;
    flex-direction: column;
    gap: 15px;
    overflow-y: auto;
}

section {
    background: #252525;
    padding: 15px;
    border-radius: 8px;
    border: 1px solid var(--border);
}

section h3 {
    margin-top: 0;
    margin-bottom: 10px;
    font-size: 1.1rem;
    color: var(--accent);
    border-bottom: 1px solid #444;
    padding-bottom: 5px;
}

.control-group {
    margin-bottom: 10px;
    display: flex;
    flex-direction: column;
}

.control-group label {
    margin-bottom: 5px;
    font-size: 0.9rem;
}

select, input[type="range"], button {
    background: #333;
    color: var(--text-main);
    border: 1px solid #555;
    padding: 8px;
    border-radius: 4px;
    outline: none;
}

button {
    cursor: pointer;
    background: #444;
    transition: background 0.2s;
    margin-top: 5px;
}

button:hover {
    background: #555;
}

button#reset-btn {
    background: var(--danger);
    color: #fff;
    border: none;
}

.anomaly-panel {
    border-color: var(--danger);
}

.anomaly-panel h3 {
    color: var(--danger);
}

#savings-display {
    color: var(--success);
    font-size: 1.2rem;
    font-weight: bold;
    margin-bottom: 5px;
}

#carbon-display {
    color: var(--accent);
    font-size: 1.1rem;
}

/* Responsive adjustments */
@media (max-width: 1200px) {
    .dashboard-grid {
        grid-template-columns: 1fr;
        grid-template-rows: auto auto;
    }
}
```

---

## 18. `config.js` — Complete Constants Module

Contains physical constants, room topologies, UI palettes, economic settings, and environmental baseline assumptions.

```javascript
// js/config.js

const CONFIG = {
    // ---------------- Canvas & Layout ----------------
    CANVAS_WIDTH: 1200,
    CANVAS_HEIGHT: 700,
    
    // ---------------- UI Colors ----------------------
    COLORS: {
        background: '#121212',
        roomWall: '#333333',
        window: '#add8e6',
        sunRay: 'rgba(255, 235, 59, 0.4)',
        hot: '#ff5252',
        cold: '#00e5ff',
        text: '#e0e0e0'
    },

    // ---------------- Physical Constants -------------
    ASHRAE_METABOLIC_HEAT: 0.12, // kW per person
    U_ENVELOPE: 0.35,            // W/m²·K (insulation factor)
    LATENT_HEAT_COEFF: 0.003,    // Humidity impact scalar
    THERMAL_DECAY_RATE: 0.02,    // Exponential cooling decay rate
    
    // ---------------- Economics & Grid ---------------
    ELECTRICITY_PRICE_PEAK: 0.25,   // $/kWh (4pm-9pm)
    ELECTRICITY_PRICE_OFFPEAK: 0.12,// $/kWh (other times)
    GRID_CARBON_INTENSITY: 0.4,     // kg CO₂ / kWh

    // ---------------- Controller Params --------------
    PID: {
        Kp: 3.0,
        Ki: 0.05,
        Kd: 1.5,
        Kff: 2.0
    },

    // ---------------- Topology & Rooms ---------------
    ROOM_CONNECTIONS: [
        { from: 'living_room', to: 'bedroom', diffusionRate: 0.05 },
        { from: 'living_room', to: 'kitchen', diffusionRate: 0.08 }
    ],

    ROOMS: [
        {
            id: 'living_room',
            name: 'Living Room',
            x: 50, y: 50, width: 600, height: 400,
            targetTempF: 72,
            windows: [
                { id: 'w1', x: 50, y: 50, width: 200, height: 10, orientation: 'N', blindState: 'open' },
                { id: 'w2', x: 50, y: 440, width: 300, height: 10, orientation: 'S', blindState: 'open' }
            ],
            objects: [
                { id: 'sofa1', label: 'Dark Sofa', x: 100, y: 150, width: 150, height: 60, thermalMass: 0.8, storedHeat: 0 },
                { id: 'tv1', label: 'Television', x: 500, y: 80, width: 20, height: 100, thermalMass: 0.3, storedHeat: 0 },
                { id: 'table1', label: 'Coffee Table', x: 120, y: 250, width: 100, height: 80, thermalMass: 0.5, storedHeat: 0 }
            ]
        },
        {
            id: 'bedroom',
            name: 'Master Bedroom',
            x: 700, y: 50, width: 400, height: 300,
            targetTempF: 68,
            windows: [
                { id: 'w3', x: 700, y: 50, width: 150, height: 10, orientation: 'N', blindState: 'open' },
                { id: 'w4', x: 1090, y: 100, width: 10, height: 150, orientation: 'E', blindState: 'open' }
            ],
            objects: [
                { id: 'bed1', label: 'Large Bed', x: 750, y: 100, width: 200, height: 180, thermalMass: 0.6, storedHeat: 0 }
            ]
        },
        {
            id: 'kitchen',
            name: 'Kitchen',
            x: 700, y: 400, width: 400, height: 250,
            targetTempF: 70,
            windows: [
                { id: 'w5', x: 1090, y: 450, width: 10, height: 100, orientation: 'E', blindState: 'open' }
            ],
            objects: [
                { id: 'oven', label: 'Oven', x: 720, y: 420, width: 60, height: 60, thermalMass: 0.9, storedHeat: 0 },
                { id: 'fridge', label: 'Refrigerator', x: 800, y: 420, width: 70, height: 80, thermalMass: 0.7, storedHeat: 0 }
            ]
        }
    ]
};
```

---

## 19. Initialization & Bootstrap (`main.js` init)

This is the system entry point. It wires together all intelligence modules, sets up external API calls, initializes Chart.js, and boots the animation loop.

```javascript
// js/main.js

let simState = {};
let modules = {};

window.addEventListener('DOMContentLoaded', async () => {
    console.log("Booting Predictive Digital Twin...");
    
    // 1. Initialize DOM Elements & Context
    const canvas = document.getElementById('sim-canvas');
    const ctx = canvas.getContext('2d');
    
    // 2. Initialize State
    simState = {
        simulatedHour: 8,          // Start at 8 AM
        simulatedTime: new Date().setHours(8, 0, 0, 0),
        dayOfYear: 172,            // Summer solstice (June 21)
        latitude: 37.7749,         // San Francisco
        frameCount: 0,
        dtSeconds: 0,
        rooms: JSON.parse(JSON.stringify(CONFIG.ROOMS)), // Deep copy from config
        weather: { outdoorTempF: 75, humidity: 45, cloud: 10, description: 'Clear' },
        activeAlerts: [],
        sensorReadings: [],
        fusedEstimate: { estimate: 72, uncertainty: 0 },
        qPredicted: { total: 0, solar: 0, occupancy: 0, envelope: 0, latent: 0, decay: 0 },
        predictiveMode: { hvacPower: {} },
        standardMode: { hvacPower: {} },
        history: { timestamps: [], temps: [], power: [] },
        forecast: { threats: [] },
        blindCommands: []
    };

    // 3. Instantiate Core Intelligence Modules
    modules.heatmap = new ThermalHeatmap(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    modules.controller = new FeedForwardPIDController(CONFIG.PID.Kp, CONFIG.PID.Ki, CONFIG.PID.Kd, CONFIG.PID.Kff);
    modules.mpc = new ModelPredictiveController();
    modules.rlAgent = new RLAgent();
    modules.blindController = new SmartBlindController(getAllWindows(simState.rooms));
    modules.sensors = new IoTSensorNetwork(5); // 5 sensors per room
    modules.fusion = new MultiSensorFusion(5);
    modules.anomaly = new AnomalyDetector();
    modules.occupancy = new StochasticOccupancyModel();
    modules.economics = new EconomicsTracker();
    modules.playback = new PlaybackEngine();
    modules.calibrator = new DigitalTwinCalibrator();

    // 4. Initialize Visualization Charts
    initCharts();

    // 5. Fetch Initial Weather Data
    try {
        simState.weather = await fetchWeather(simState.latitude);
        document.getElementById('weather-badge').textContent = `${simState.weather.outdoorTempF}°F | ${simState.weather.description}`;
    } catch (err) {
        console.warn("WeatherAPI failed, using fallback data.");
    }

    // 6. Hook up UI Event Listeners
    setupEventListeners();

    // 7. Start Simulation Loop
    let lastTime = performance.now();
    function loop(time) {
        simState.dtSeconds = calculateDt(time, lastTime);
        lastTime = time;
        simulationTick(ctx, simState, modules);
    }
    requestAnimationFrame(loop);
});

function initCharts() {
    const tempCtx = document.getElementById('temp-chart').getContext('2d');
    modules.tempChart = new Chart(tempCtx, {
        type: 'line',
        data: { labels: [], datasets: [
            { label: 'Room Temp (°F)', data: [], borderColor: CONFIG.COLORS.hot, tension: 0.1 },
            { label: 'Target Temp', data: [], borderColor: CONFIG.COLORS.text, borderDash: [5, 5] }
        ]},
        options: { responsive: true, animation: false }
    });

    const powerCtx = document.getElementById('power-chart').getContext('2d');
    modules.powerChart = new Chart(powerCtx, {
        type: 'bar',
        data: { labels: [], datasets: [
            { label: 'HVAC Power (%)', data: [], backgroundColor: CONFIG.COLORS.cold }
        ]},
        options: { responsive: true, animation: false }
    });
}

function setupEventListeners() {
    document.getElementById('reset-btn').addEventListener('click', resetSimulation);
    document.getElementById('calibrate-btn').addEventListener('click', () => {
        modules.calibrator.startCalibration();
        alert("Calibration mode started. Gathering observations.");
    });
}
```

---

## 20. Helper Utility Functions (`utils.js`)

Common data parsing, formatting, array flattening, and UI update bridges used throughout the application.

```javascript
// js/utils.js

// Time calculations
function calculateDt(currentTime, lastTime) {
    const timeSpeed = parseInt(document.getElementById('time-speed').value, 10);
    // Real delta time in seconds, multiplied by the UI speed factor
    return ((currentTime - lastTime) / 1000) * timeSpeed;
}

function formatTime(hourDecimal) {
    const h = Math.floor(hourDecimal);
    const m = Math.floor((hourDecimal - h) * 60);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
}

// Room entity traversal
function getAllWindows(rooms) {
    let windows = [];
    rooms.forEach(r => { windows = windows.concat(r.windows); });
    return windows;
}

function getAllObjects(rooms) {
    let objects = [];
    rooms.forEach(r => { objects = objects.concat(r.objects); });
    return objects;
}

// Controller Application
function applyBlindCommands(rooms, commands) {
    rooms.forEach(room => {
        room.windows.forEach(win => {
            const cmd = commands.find(c => c.windowId === win.id);
            if (cmd) {
                win.blindState = cmd.action;
            }
        });
    });
}

// Data Logging
function logDataPoint(state) {
    // Only log every few frames to prevent memory bloat
    if (state.frameCount % 30 !== 0) return;
    
    state.history.timestamps.push(formatTime(state.simulatedHour));
    state.history.temps.push(state.rooms[0].tempF);
    
    // Calculate total power usage across all rooms
    const totalPower = state.rooms.reduce((sum, r) => sum + (state.predictiveMode.hvacPower[r.id] || 0), 0);
    state.history.power.push(totalPower);

    // Keep history buffer size reasonable
    if (state.history.timestamps.length > 100) {
        state.history.timestamps.shift();
        state.history.temps.shift();
        state.history.power.shift();
    }
}

// Reset Handler
function resetSimulation() {
    console.log("Resetting simulation state...");
    simState.simulatedHour = 8;
    simState.rooms = JSON.parse(JSON.stringify(CONFIG.ROOMS)); // Deep clone from config
    simState.history = { timestamps: [], temps: [], power: [] };
    
    // Reset charts
    if(modules.tempChart) {
        modules.tempChart.data.labels = [];
        modules.tempChart.data.datasets.forEach(d => d.data = []);
        modules.tempChart.update();
    }
    if(modules.powerChart) {
        modules.powerChart.data.labels = [];
        modules.powerChart.data.datasets.forEach(d => d.data = []);
        modules.powerChart.update();
    }
    
    // Reset controller integrals
    modules.controller.reset();
}

// UI Panel Updaters
function updateForecastPanel(threats) {
    const list = document.getElementById('threat-list');
    list.innerHTML = '';
    if (threats.length === 0) {
        list.innerHTML = '<li>No immediate thermal threats detected.</li>';
        return;
    }
    threats.forEach(t => {
        const li = document.createElement('li');
        li.textContent = `Sun hits ${t.objectLabel} in ${t.minutesUntil}m (Spike: +${t.estimatedHeatSpike.toFixed(2)})`;
        list.appendChild(li);
    });
}

function updateAnomalyPanel(alerts) {
    const list = document.getElementById('anomaly-list');
    list.innerHTML = '';
    if (alerts.length === 0) {
        list.innerHTML = '<li>System nominal.</li>';
        return;
    }
    alerts.forEach(a => {
        const li = document.createElement('li');
        li.style.color = CONFIG.COLORS.hot;
        li.textContent = `[WARN] ${a.message}`;
        list.appendChild(li);
    });
}

function updateSensorPanel(readings, fused) {
    const list = document.getElementById('sensor-readings');
    list.innerHTML = readings.map((r, i) => `S${i+1}: ${r.toFixed(1)}°F`).join(' | ');
    document.getElementById('fused-estimate').textContent = `Fused Estimate: ${fused.estimate.toFixed(2)}°F (±${fused.uncertainty.toFixed(2)})`;
}

function updateSavingsPanel(savingsData) {
    document.getElementById('savings-display').textContent = `$${savingsData.dollarsSaved.toFixed(2)} saved today`;
    document.getElementById('carbon-display').textContent = `${savingsData.carbonAvoidedKg.toFixed(2)} kg CO₂ avoided`;
}
```
