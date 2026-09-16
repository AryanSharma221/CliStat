// js/mlBridge.js
// =============================================================================
// ML Bridge — Connects the 3D simulation to the FastAPI XGBoost backend
// =============================================================================
// Polls the backend every 5 seconds with per-room parameters derived from
// CONFIG, system time, live weather, and hotspot occupancy.
// Pushes ML-predicted HVAC power into the simulation via window.SimulationAPI.

const ML_BRIDGE = {
    API_BASE: window.location.hostname === 'localhost' ? 'http://localhost:8000' : '',
    POLL_INTERVAL: 5000,
    lastPrediction: null,
    lastWeather: null,
    lastOccupancy: 0,
    isRunning: false,

    // Derive room parameters from CONFIG for per-room XGBoost prediction
    getRoomParams() {
        if (typeof CONFIG === 'undefined') return [];
        return CONFIG.ROOMS.map(room => {
            // Determine primary window orientation
            let primaryDir = 'North';
            if (room.windows && room.windows.length > 0) {
                // Use the orientation of the largest window
                let maxArea = 0;
                room.windows.forEach(w => {
                    const area = w.width * (w.height || 10);
                    if (area > maxArea) {
                        maxArea = area;
                        primaryDir = w.orientation || 'N';
                    }
                });
                // Convert short to full name
                const dirMap = { 'N': 'North', 'S': 'South', 'E': 'East', 'W': 'West' };
                primaryDir = dirMap[primaryDir] || primaryDir;
            }

            // Compute room area in m² (canvas units → rough m² conversion)
            // Canvas is ~1200x700 for a ~24x14m building, so 1 canvas unit ≈ 0.02m
            const scaleX = 24 / 1200;
            const scaleY = 14 / 700;
            const roomAreaM2 = (room.width * scaleX) * (room.height * scaleY);

            // Total window area in m²
            let windowAreaM2 = 0;
            if (room.windows) {
                room.windows.forEach(w => {
                    const wWidth = w.width * scaleX;
                    const wHeight = (w.height || 10) * scaleY;
                    windowAreaM2 += wWidth * wHeight;
                });
            }
            // Ensure reasonable minimum window area
            windowAreaM2 = Math.max(windowAreaM2, 1.0);

            return {
                room_id: room.id,
                room_direction: primaryDir,
                room_area: Math.round(roomAreaM2 * 100) / 100,
                window_area: Math.round(windowAreaM2 * 100) / 100
            };
        });
    },

    async fetchWeather() {
        try {
            const res = await fetch(`${this.API_BASE}/api/weather`);
            if (res.ok) {
                this.lastWeather = await res.json();
            }
        } catch (e) {
            console.warn('ML Bridge: Weather fetch failed', e);
        }
    },

    async fetchOccupancy() {
        try {
            const res = await fetch(`${this.API_BASE}/api/occupancy`);
            if (res.ok) {
                const data = await res.json();
                this.lastOccupancy = data.count || 0;
            }
        } catch (e) {
            console.warn('ML Bridge: Occupancy fetch failed', e);
        }
    },

    async fetchPrediction(targetTemp) {
        try {
            const rooms = this.getRoomParams();
            if (rooms.length === 0) return;

            const now = new Date();
            const outdoorTemp = this.lastWeather ? this.lastWeather.outside_temperature : 30;

            const payload = {
                rooms: rooms,
                required_temperature: targetTemp,
                room_temperature: outdoorTemp,  // outdoor temp as proxy
                heating_setpoint: targetTemp - 2.0,
                timestamp: now.toISOString(),
                city: 'Chennai',
                occupancy: this.lastOccupancy,
                outside_temperature: outdoorTemp,
                humidity: this.lastWeather ? this.lastWeather.humidity : 60,
                wind_speed: this.lastWeather ? this.lastWeather.wind_speed : 3,
                solar_radiation: this.lastWeather ? this.lastWeather.solar_radiation : 0,
                max_hvac_capacity_w: 5000.0
            };

            const res = await fetch(`${this.API_BASE}/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                this.lastPrediction = await res.json();
            }
        } catch (e) {
            console.warn('ML Bridge: Prediction fetch failed', e);
        }
    },

    // Push ML prediction into the simulation dashboard
    pushToSimulation() {
        if (!this.lastPrediction) return;

        const pred = this.lastPrediction;

        // Override HVAC display via SimulationAPI
        if (window.SimulationAPI && window.SimulationAPI.overrideHVAC) {
            const avgPower = pred.avg_load_percentage || 0;
            
            // Determine if we are heating or cooling
            let sign = -1; // Default cooling
            if (window.SimulationAPI.getState) {
                const state = window.SimulationAPI.getState();
                if (state && state.targetTempCelsius > state.indoorAvgCelsius) {
                    sign = 1; // Heating
                }
            }
            
            const exchangeKw = sign * (avgPower / 100) * 5.0;
            const modeLabel = 'XGBoost ML Model (Live)';
            window.SimulationAPI.overrideHVAC(avgPower, exchangeKw, modeLabel);
        }

        // Update weather display
        const weatherEl = document.getElementById('weather-status');
        if (weatherEl && this.lastWeather) {
            const w = this.lastWeather;
            weatherEl.innerHTML = `${w.outside_temperature.toFixed(1)}&deg;C &bull; ${w.condition} (${w.cloud_cover}% clouds)`;
        }

        // Update occupancy display
        const occVal = document.getElementById('occupancy-val');
        if (occVal) {
            occVal.textContent = this.lastOccupancy + ' devices';
        }

        // Update ML prediction card
        const mlPowerEl = document.getElementById('ml-power');
        const mlLoadEl = document.getElementById('ml-load');
        const mlStatusEl = document.getElementById('ml-status');

        if (mlPowerEl) {
            mlPowerEl.innerHTML = pred.total_power_kw.toFixed(2) + '<span class="unit">kW</span>';
        }
        if (mlLoadEl) {
            mlLoadEl.innerHTML = pred.avg_load_percentage.toFixed(1) + '<span class="unit">%</span>';
        }
        if (mlStatusEl) {
            mlStatusEl.textContent = `${Object.keys(pred.per_room).length} rooms • ${this.lastOccupancy} devices • ${pred.live_data.city}`;
        }

        // Update per-room breakdown
        const roomBreakdown = document.getElementById('ml-room-breakdown');
        if (roomBreakdown && pred.per_room) {
            let html = '';
            for (const [roomId, data] of Object.entries(pred.per_room)) {
                const name = roomId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                html += `<li><span class="label">${name}</span><span class="val">${data.predicted_power_kw.toFixed(1)} kW (${data.hvac_load_percentage}%)</span></li>`;
            }
            roomBreakdown.innerHTML = html;
        }
    },

    async poll(targetTemp) {
        await this.fetchWeather();
        await this.fetchOccupancy();
        await this.fetchPrediction(targetTemp);
        this.pushToSimulation();
    },

    start() {
        if (this.isRunning) return;
        this.isRunning = true;

        // Initial fetch
        const getTarget = () => {
            const slider = document.getElementById('target-temp-slider');
            return slider ? parseFloat(slider.value) : 22.0;
        };

        this.poll(getTarget());

        // Poll every 5 seconds
        this._interval = setInterval(() => {
            this.poll(getTarget());
        }, this.POLL_INTERVAL);

        console.log('ML Bridge started — polling FastAPI every 5s');
    },

    stop() {
        if (this._interval) clearInterval(this._interval);
        this.isRunning = false;
    }
};

// Auto-start when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to let other scripts initialize first
    setTimeout(() => ML_BRIDGE.start(), 1000);
});
