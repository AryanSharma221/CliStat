// js/ui.js
// =============================================================================
// MEMBER 3 — 3D Visualization & UI Controller
// -----------------------------------------------------------------------------
// MERGED VERSION: Uses real system time, live weather API, and XGBoost ML
// predictions from the FastAPI backend instead of manual sliders.
// =============================================================================

class UIController {
    constructor(simulation) {
        this.simulation = simulation;
        
        // Use real system time
        const now = new Date();
        this.settings = {
            time: now.getHours() + now.getMinutes() / 60.0,
            season: this._getSeason(now),
            latitude: 13.08,       // Chennai latitude
            animateTime: true,     // Always animate with real time
            timeSpeed: 1 / 60
        };

        // --- CONTROLLER MODE ---
        this.activeMode = 'predictive'; // 'predictive' = ML model, 'standard' = BangBang
        this.hvacController = new FeedForwardPIDController(1.5, 0.1, 0.05, 0.2);
        this.bangbangController = new BangBangController(0.5);

        // --- ENERGY / COST / CO2 TRACKING ---
        this.maxHvacCapacityKw = 5.0;
        this.gridCarbonIntensity = 0.82;
        this.smartEnergyKwh = 0;
        this.baselineEnergyKwh = 0;
        this.smartCostRupees = 0;
        this.baselineCostRupees = 0;
        this.smartCO2Kg = 0;
        this.baselineCO2Kg = 0;
        this.lastSimTime = null;

        // ML Bridge override power
        this.mlPowerPct = null;

        this.bindElements();
        this.addEventListeners();
        
        // Expose API for backend integration
        window.SimulationAPI = {
            getState: () => this.currentState,
            setTargetTemp: (temp) => {
                this.targetTempSlider.value = temp;
                this.targetTempVal.textContent = parseFloat(temp).toFixed(1);
                if (this.targetTempValDisplay) {
                    this.targetTempValDisplay.innerHTML = parseFloat(temp).toFixed(1) + '<span class="unit">&deg;C</span>';
                }
                this.updateStats();
            },
            setTime: (time) => {
                this.settings.time = time;
                this.updateStats();
            },
            overrideHVAC: (powerPct, exchangeKw, modeString) => {
                this.mlPowerPct = powerPct;
                this.hvacPower.innerHTML = Math.round(powerPct) + '<span class="unit">%</span>';
                this.heatExchange.innerHTML = (exchangeKw > 0 ? '+' : '') + parseFloat(exchangeKw).toFixed(2) + '<span class="unit">kW</span>';
                this.hvacMode.innerHTML = modeString;
                
                if (exchangeKw < -0.1) this.heatExchange.className = 'text-accent';
                else if (exchangeKw > 0.1) this.heatExchange.className = 'text-warning';
                else this.heatExchange.className = 'text-success';
            }
        };

        this.updateStats();
    }

    _getSeason(date) {
        const m = date.getMonth(); // 0-11
        if (m >= 2 && m <= 4) return 'Spring';
        if (m >= 5 && m <= 7) return 'Summer';
        if (m >= 8 && m <= 10) return 'Fall';
        return 'Winter';
    }

    _getDayOfYear(date) {
        const start = new Date(date.getFullYear(), 0, 0);
        const diff = date - start;
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }

    bindElements() {
        this.clockDisplay = document.getElementById('clock-display');
        this.dateDisplay = document.getElementById('date-display');
        
        this.modePredictive = document.getElementById('mode-predictive');
        this.modeStandard = document.getElementById('mode-standard');
        
        this.nextEventTime = document.getElementById('next-event-time');

        // Telemetry Elements
        this.targetTempSlider = document.getElementById('target-temp-slider');
        this.targetTempVal = document.getElementById('target-temp-val');
        this.targetTempValDisplay = document.getElementById('target-temp-val-display'); // The new H2 display
        this.indoorTempSlider = document.getElementById('indoor-temp-slider');
        this.indoorAvg = document.getElementById('indoor-avg');
        this.deviationVal = document.getElementById('deviation-val');
        this.heatLoad = document.getElementById('heat-load');
        this.heatExchange = document.getElementById('heat-exchange');
        this.hvacPower = document.getElementById('hvac-power');
        this.hvacMode = document.getElementById('hvac-mode');

        this.vecSolar = document.getElementById('vec-solar');
        this.vecOcc = document.getElementById('vec-occ');
        this.vecEnv = document.getElementById('vec-env');
        this.vecDecay = document.getElementById('vec-decay');

        // Occupancy and Weather Elements
        this.occupancyVal = document.getElementById('occupancy-val');
        this.weatherStatus = document.getElementById('weather-status');

        // Savings & Carbon Elements
        this.savingsPct = document.getElementById('savings-pct');
        this.smartKwh = document.getElementById('smart-kwh');
        this.baselineKwh = document.getElementById('baseline-kwh');
        this.costSaved = document.getElementById('cost-saved');
        this.co2Avoided = document.getElementById('co2-avoided');
        this.carbonRate = document.getElementById('carbon-rate');
        this.carbonStatus = document.getElementById('carbon-status');
        this.algoTrace = document.getElementById('algo-trace');

        // Formulas Panel
        this.formulasPanel = document.getElementById('formulas-panel');
        this.formulasContent = document.getElementById('formulas-content');
        this.formulasPanelOpen = false;
        
        const toggleBtn = document.getElementById('formulas-toggle-btn');
        const closeBtn = document.getElementById('formulas-close-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleFormulasPanel());
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.toggleFormulasPanel());
        }

        // Init settings defaults
        this.settings.occupancy = 0;
        this.weatherData = { tempC: null, condition: 'Loading...', cloudCover: 0 };
        this.fetchWeather();
    }

    toggleFormulasPanel() {
        this.formulasPanelOpen = !this.formulasPanelOpen;
        if (this.formulasPanel) {
            this.formulasPanel.style.display = this.formulasPanelOpen ? 'block' : 'none';
        }
    }

    async fetchWeather() {
        try {
            // Fetch from our own FastAPI backend which caches the OWM response
            const apiBase = (typeof ML_BRIDGE !== 'undefined') ? ML_BRIDGE.API_BASE : (window.location.hostname === 'localhost' ? 'http://localhost:8000' : '');
            const res = await fetch(`${apiBase}/api/weather`);
            if (!res.ok) throw new Error('API returned ' + res.status);
            const data = await res.json();
            
            this.weatherData = {
                tempC: data.outside_temperature,
                humidity: data.humidity,
                condition: data.condition,
                cloudCover: data.cloud_cover
            };
            
            if (this.weatherStatus) {
                this.weatherStatus.innerHTML = `${this.weatherData.tempC.toFixed(1)}&deg;C &bull; ${this.weatherData.condition} (${this.weatherData.cloudCover}% clouds)`;
            }
            this.updateStats();
        } catch (e) {
            console.warn("Weather fetch via FastAPI failed, trying OWM directly:", e);
            // Fallback: fetch directly from OWM
            try {
                const apiKey = "f2a535c74ca8328f5e3abe55e599712b";
                const url = `https://api.openweathermap.org/data/2.5/weather?q=Chennai,IN&appid=${apiKey}&units=metric`;
                const res = await fetch(url);
                const data = await res.json();
                this.weatherData = {
                    tempC: data.main.temp,
                    humidity: data.main.humidity,
                    condition: data.weather[0].main,
                    cloudCover: data.clouds.all
                };
                if (this.weatherStatus) {
                    this.weatherStatus.innerHTML = `${this.weatherData.tempC.toFixed(1)}&deg;C &bull; ${this.weatherData.condition} (${this.weatherData.cloudCover}% clouds)`;
                }
                this.updateStats();
            } catch (e2) {
                console.error("All weather fetch failed:", e2);
                if (this.weatherStatus) this.weatherStatus.innerHTML = `Error fetching API`;
            }
        }
    }

    addEventListeners() {
        // Target Temp Slider
        this.targetTempSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value).toFixed(1);
            this.targetTempVal.textContent = val;
            if (this.targetTempValDisplay) {
                this.targetTempValDisplay.innerHTML = val + '<span class="unit">&deg;C</span>';
            }
            this.updateStats();
        });

        // Indoor Temp Slider
        if (this.indoorTempSlider) {
            this.indoorTempSlider.addEventListener('input', (e) => {
                this.indoorAvg.innerHTML = parseFloat(e.target.value).toFixed(1) + '<span class="unit">&deg;C</span>';
                this.updateStats();
            });
        }

        // Mode Toggles
        this.modePredictive.addEventListener('click', () => {
            this.activeMode = 'predictive';
            this.modePredictive.classList.add('active');
            this.modeStandard.classList.remove('active');
            this.hvacController.reset();
            this.smartEnergyKwh = 0; this.baselineEnergyKwh = 0;
            this.smartCostRupees = 0; this.baselineCostRupees = 0;
            this.smartCO2Kg = 0; this.baselineCO2Kg = 0;
            this.lastSimTime = null;
        });

        this.modeStandard.addEventListener('click', () => {
            this.activeMode = 'standard';
            this.modeStandard.classList.add('active');
            this.modePredictive.classList.remove('active');
            this.smartEnergyKwh = 0; this.baselineEnergyKwh = 0;
            this.smartCostRupees = 0; this.baselineCostRupees = 0;
            this.smartCO2Kg = 0; this.baselineCO2Kg = 0;
            this.lastSimTime = null;
        });
    }

    update(dt) {
        // Always use real system time
        const now = new Date();
        this.settings.time = now.getHours() + now.getMinutes() / 60.0 + now.getSeconds() / 3600.0;
        this.simulation.params.timeOfDay = this.settings.time;
        this.simulation.params.dayOfYear = this._getDayOfYear(now);
        this.updateStats(true);
    }

    updateStats(isAnimationFrame = false) {
        this.simulation.updateSunPosition();
        
        const time = this.settings.time;
        const now = new Date();

        // Update clock display with real system time
        const h = now.getHours();
        const m = now.getMinutes();
        const s = now.getSeconds();
        if (this.clockDisplay) {
            this.clockDisplay.textContent = 
                `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        if (this.dateDisplay) {
            const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
            const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
            this.dateDisplay.textContent = `${days[now.getDay()]} - ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
        }
        
        // =====================================================================
        //  THERMODYNAMIC ENGINE (still runs for Q-vectors and baseline comparison)
        // =====================================================================
        const targetTemp = parseFloat(this.targetTempSlider.value);
        const day = this._getDayOfYear(now);
        
        // --- 1. BASE TEMPERATURE (Weather API) ---
        let baseTemp = 21.0; 
        if (this.weatherData && this.weatherData.tempC !== undefined && this.weatherData.tempC !== null) {
            baseTemp = this.weatherData.tempC;
            // Seasonal modifier based on real date
            if (day >= 150 && day <= 240) baseTemp += 4.5;
            else if (day < 60 || day > 300) baseTemp -= 11.0;
            else baseTemp -= 3.0;
        }

        // --- 2. SOLAR GAIN ---
        const cloudCover = (this.weatherData && this.weatherData.cloudCover) || 0;
        const sunIntensity = getSunIntensity(time, cloudCover);
        const windowArea = 8.0;
        const SHGC = 0.4;
        const solarIrradiance = 1000;
        const qSolarKw = sunIntensity * windowArea * SHGC * solarIrradiance / 1000;

        // --- 3. OCCUPANCY HEAT GAIN ---
        // Use ML bridge occupancy
        const occupancy = (typeof ML_BRIDGE !== 'undefined') ? ML_BRIDGE.lastOccupancy : 0;
        this.settings.occupancy = occupancy;
        const qOccupancyKw = occupancy * 0.12;

        // --- 4. ENVELOPE LOAD ---
        const outdoorTemp = baseTemp;
        const U_envelope = 0.35;
        const A_envelope = 45;
        const deltaT_envelope = Math.max(0, outdoorTemp - targetTemp);
        const qEnvelopeKw = (U_envelope * A_envelope * deltaT_envelope) / 1000;

        // --- 5. THERMAL DECAY ---
        const qDecayKw = qSolarKw * 0.08;

        // --- TOTAL PREDICTED HEAT LOAD ---
        const totalHeatLoadKw = qSolarKw + qOccupancyKw + qEnvelopeKw + qDecayKw;
        // --- 5. INDOOR TEMPERATURE CALCULATION ---
        const buildingHeatLossCoeff = 0.5;
        const totalGainDegC = totalHeatLoadKw / buildingHeatLossCoeff;
        
        let rawIndoorTemp;
        if (this.indoorTempSlider) {
            // Read from manual slider override
            rawIndoorTemp = parseFloat(this.indoorTempSlider.value);
        } else {
            // Physics simulation fallback
            rawIndoorTemp = baseTemp + totalGainDegC;
        }

        // =====================================================================
        //  HVAC CONTROLLER — ML Model or BangBang depending on mode
        // =====================================================================
        const rawDeviation = rawIndoorTemp - targetTemp;
        const maxHvacDelta = 10.0;
        
        let simDt = 1.0 / 60.0;
        if (isAnimationFrame && this.lastSimTime !== null) {
            simDt = Math.max(0.001, this.settings.time - this.lastSimTime);
            if (simDt > 1.0) simDt = 1.0 / 60.0;
        }

        let powerPct;
        let controllerLabel;

        if (this.activeMode === 'predictive' && this.mlPowerPct !== null) {
            // USE ML MODEL PREDICTION
            powerPct = this.mlPowerPct;
            controllerLabel = 'XGBoost ML Model (Live)';
        } else if (this.activeMode === 'predictive') {
            // Fallback to PID if ML not yet available
            powerPct = this.hvacController.compute(rawIndoorTemp, targetTemp, totalHeatLoadKw, simDt);
            controllerLabel = 'PID + Feed-Forward (fallback)';
        } else {
            powerPct = this.bangbangController.compute(rawIndoorTemp, targetTemp);
            controllerLabel = 'Bang-Bang (On/Off)';
        }

        // --- BASELINE CONTROLLER (always runs in shadow for comparison) ---
        const baselinePower = this.bangbangController.compute(rawIndoorTemp, targetTemp);

        // --- APPLY HVAC EFFECT ---
        let maxHvacPull = maxHvacDelta * (powerPct / 100);
        let actualHvacDelta = 0;
        if (Math.abs(rawDeviation) <= maxHvacPull) {
            actualHvacDelta = rawDeviation;
        } else {
            actualHvacDelta = Math.sign(rawDeviation) * maxHvacPull;
        }
        
        const indoorTemp = rawIndoorTemp - actualHvacDelta;
        const exchangeKw = -(actualHvacDelta * (this.maxHvacCapacityKw / maxHvacDelta));

        // =====================================================================
        //  ENERGY / COST / CO2 ACCUMULATION
        // =====================================================================
        if (isAnimationFrame && this.lastSimTime !== null) {
            const dtHours = Math.max(0, Math.min(simDt, 0.5));
            const isPeak = (time >= 16 && time <= 21);
            const ratePerKwh = isPeak ? 8.0 : 4.5;
            
            const smartPowerKw = (powerPct / 100) * this.maxHvacCapacityKw;
            this.smartEnergyKwh += smartPowerKw * dtHours;
            this.smartCostRupees += smartPowerKw * dtHours * ratePerKwh;
            this.smartCO2Kg += smartPowerKw * dtHours * this.gridCarbonIntensity;
            
            const baselinePowerKw = (baselinePower / 100) * this.maxHvacCapacityKw;
            this.baselineEnergyKwh += baselinePowerKw * dtHours;
            this.baselineCostRupees += baselinePowerKw * dtHours * ratePerKwh;
            this.baselineCO2Kg += baselinePowerKw * dtHours * this.gridCarbonIntensity;
        }
        if (isAnimationFrame) {
            this.lastSimTime = this.settings.time;
        }

        // =====================================================================
        //  UPDATE DASHBOARD
        // =====================================================================
        if (!this.indoorTempSlider) {
            this.indoorAvg.innerHTML = indoorTemp.toFixed(1) + '<span class="unit">&deg;C</span>';
        }
        
        // Use rawIndoorTemp for deviation if slider exists, else indoorTemp
        const displayTemp = this.indoorTempSlider ? rawIndoorTemp : indoorTemp;
        const finalDeviation = displayTemp - targetTemp;
        const sign = finalDeviation > 0 ? '+' : (finalDeviation < 0 ? '-' : '');
        this.deviationVal.textContent = sign + Math.abs(finalDeviation).toFixed(1);

        this.heatLoad.innerHTML = totalHeatLoadKw.toFixed(2) + '<span class="unit">kW</span>';

        // Only update HVAC display if ML bridge hasn't overridden it
        if (this.activeMode !== 'predictive' || this.mlPowerPct === null) {
            this.heatExchange.innerHTML = (exchangeKw > 0 ? '+' : '') + exchangeKw.toFixed(2) + '<span class="unit">kW</span>';
            if (exchangeKw < -0.1) {
                this.heatExchange.className = 'text-accent';
                this.hvacMode.innerHTML = `cooling active (${this.weatherData.condition || 'N/A'}) &bull; ${controllerLabel}`;
            } else if (exchangeKw > 0.1) {
                this.heatExchange.className = 'text-warning';
                this.hvacMode.innerHTML = `heating active (${this.weatherData.condition || 'N/A'}) &bull; ${controllerLabel}`;
            } else {
                this.heatExchange.className = 'text-success';
                this.hvacMode.innerHTML = `hvac standby &bull; ${controllerLabel}`;
            }
            this.hvacPower.innerHTML = Math.round(powerPct) + '<span class="unit">%</span>';
        }

        // --- CARBON FOOTPRINT ---
        if (this.carbonRate) {
            const currentCarbonKgH = (powerPct / 100) * this.maxHvacCapacityKw * this.gridCarbonIntensity;
            this.carbonRate.innerHTML = currentCarbonKgH.toFixed(2) + '<span class="unit">kg/h</span>';
            this.carbonRate.className = currentCarbonKgH > 2.0 ? 'text-warning' : (currentCarbonKgH > 0.5 ? '' : 'text-success');
            if (this.carbonStatus) {
                this.carbonStatus.textContent = (time >= 16 && time <= 21) ? 'peak hours ⚡' : 'off-peak 🌿';
            }
        }

        // --- Q PREDICTED / VECTORS ---
        const qTotal = totalHeatLoadKw || 0.001;
        const solarPct = (qSolarKw / qTotal) * 100;
        const occPct = (qOccupancyKw / qTotal) * 100;
        const envPct = (qEnvelopeKw / qTotal) * 100;
        const decayPct = (qDecayKw / qTotal) * 100;

        this.vecSolar.textContent = Math.round(solarPct) + '%';
        this.vecOcc.textContent = Math.round(occPct) + '%';
        this.vecEnv.textContent = Math.round(envPct) + '%';
        this.vecDecay.textContent = Math.round(decayPct) + '%';

        // --- ALGORITHM DECISION TRACE ---
        if (this.algoTrace) {
            let traceHtml = '';
            if (this.activeMode === 'predictive' && this.mlPowerPct !== null) {
                // ML Model trace
                const pred = (typeof ML_BRIDGE !== 'undefined' && ML_BRIDGE.lastPrediction) ? ML_BRIDGE.lastPrediction : null;
                traceHtml = `
                    <div><b>Mode:</b> ${controllerLabel}</div>
                    <div style="margin:4px 0; padding:4px; background:rgba(14,165,233,0.08); border-radius:4px;">
                        <b>ML Predicted Power:</b> ${pred ? pred.total_power_kw.toFixed(2) + ' kW' : 'N/A'}
                    </div>
                    <div><b>Avg Load:</b> ${pred ? pred.avg_load_percentage.toFixed(1) + '%' : 'N/A'}</div>
                    <div><b>Rooms:</b> ${pred ? Object.keys(pred.per_room).length : '?'}</div>
                    <div><b>Occupancy:</b> ${pred ? pred.live_data.occupancy_from_hotspot + ' devices' : 'N/A'}</div>
                    <div><b>Weather:</b> ${pred ? pred.live_data.outside_temperature.toFixed(1) + '°C' : 'N/A'}</div>
                    <div><b>Baseline (BangBang):</b> ${baselinePower}%</div>
                    <div style="margin-top:4px;color:${Math.abs(finalDeviation) > 1 ? '#f97316' : '#22c55e'}"><b>Status:</b> ${Math.abs(finalDeviation) < 0.5 ? '✅ At setpoint' : '🔄 ML optimizing...'}</div>
                `;
            } else if (this.activeMode === 'predictive' && this.hvacController.lastError !== undefined) {
                const c = this.hvacController;
                traceHtml = `
                    <div><b>Sensor:</b> env=${rawIndoorTemp.toFixed(1)}°C → target=${targetTemp.toFixed(1)}°C</div>
                    <div><b>Mode:</b> ${controllerLabel}</div>
                    <div style="margin:4px 0; padding:4px; background:rgba(56,189,248,0.08); border-radius:4px;">
                        <b>P</b>=${c.lastP.toFixed(2)} 
                        <b>I</b>=${c.lastI.toFixed(2)} 
                        <b>D</b>=${c.lastD.toFixed(2)} 
                        <b>FF</b>=${c.lastFF.toFixed(2)}
                    </div>
                    <div><b>Output:</b> ${powerPct.toFixed(0)}% → ${Math.abs(exchangeKw).toFixed(1)} kW ${exchangeKw < 0 ? 'cooling' : 'heating'}</div>
                    <div><b>Baseline:</b> ${baselinePower}%</div>
                `;
            } else {
                traceHtml = `
                    <div><b>Sensor:</b> env=${rawIndoorTemp.toFixed(1)}°C → target=${targetTemp.toFixed(1)}°C</div>
                    <div><b>Mode:</b> ${controllerLabel}</div>
                    <div style="margin:4px 0; padding:4px; background:rgba(248,113,113,0.08); border-radius:4px;">
                        <b>Decision:</b> ${powerPct > 0 ? 'ON (100%)' : 'OFF (0%)'}
                    </div>
                    <div><b>Hysteresis:</b> ±0.5°C deadband</div>
                `;
            }
            this.algoTrace.innerHTML = traceHtml;
        }

        // --- LIVE FORMULAS PANEL ---
        if (this.formulasPanelOpen && this.formulasContent) {
            const s = (v) => `<span style="color:#38bdf8;font-weight:bold">${v}</span>`;
            const w = (v) => `<span style="color:#f97316;font-weight:bold">${v}</span>`;
            const g = (v) => `<span style="color:#22c55e;font-weight:bold">${v}</span>`;
            const r = (v) => `<span style="color:#f87171;font-weight:bold">${v}</span>`;
            
            const section = (title) => `<div style="color:#0ea5e9;font-weight:bold;margin:16px 0 6px;border-bottom:1px solid #1e293b;padding-bottom:4px;font-size:1.1em;">▸ ${title}</div>`;
            
            const apiTemp = (this.weatherData && this.weatherData.tempC != null) ? this.weatherData.tempC.toFixed(1) : 'N/A';
            
            const pred = (typeof ML_BRIDGE !== 'undefined' && ML_BRIDGE.lastPrediction) ? ML_BRIDGE.lastPrediction : null;
            
            let mlSection = '';
            if (pred) {
                mlSection = `
                    ${section('ML MODEL OUTPUT (XGBoost)')}
                    <div>Total Predicted Power: ${r(pred.total_power_kw.toFixed(2) + ' kW')}</div>
                    <div>Average Load: ${w(pred.avg_load_percentage.toFixed(1) + '%')}</div>
                    <div>Occupancy (hotspot): ${s(pred.live_data.occupancy_from_hotspot + ' devices')}</div>
                    <div>Weather Source: ${s(pred.live_data.city)}</div>
                    <div>Outside Temp: ${s(pred.live_data.outside_temperature.toFixed(1) + '°C')}</div>
                    <div>Solar Radiation: ${s(pred.live_data.solar_radiation.toFixed(0) + ' W/m²')}</div>
                `;
                // Per-room breakdown
                for (const [roomId, data] of Object.entries(pred.per_room)) {
                    const name = roomId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                    mlSection += `<div style="margin-top:4px">${name}: ${w(data.predicted_power_kw.toFixed(2) + ' kW')} (${data.hvac_load_percentage}%) — ${s(data.room_direction)}</div>`;
                }
            }

            this.formulasContent.innerHTML = `
                ${mlSection}
                ${section('THERMODYNAMIC Q-VECTORS (reference)')}
                <div>Q_solar = ${w(qSolarKw.toFixed(3) + ' kW')}</div>
                <div>Q_occ = ${w(qOccupancyKw.toFixed(3) + ' kW')} (${occupancy} devices × 0.12)</div>
                <div>Q_env = ${w(qEnvelopeKw.toFixed(3) + ' kW')}</div>
                <div>Q_decay = ${w(qDecayKw.toFixed(3) + ' kW')}</div>
                <div>Q_total = ${r(totalHeatLoadKw.toFixed(3) + ' kW')}</div>
                
                ${section('ENVIRONMENT')}
                <div>API Temp: ${s(apiTemp + '°C')} → Base: ${w(baseTemp.toFixed(1) + '°C')}</div>
                <div>Sun Intensity: ${s(sunIntensity.toFixed(3))}</div>
                <div>Raw Indoor: ${r(rawIndoorTemp.toFixed(1) + '°C')}</div>
                <div>Final Indoor: ${g(indoorTemp.toFixed(1) + '°C')}</div>
            `;
        }

        // --- NEXT THERMAL EVENT ---
        if (time < 12) {
            const mins = Math.floor((12 - time) * 60);
            this.nextEventTime.innerHTML = `Sun reaches open workspace in ${mins} min`;
        } else if (time >= 12 && time < 15) {
            const mins = Math.floor((15 - time) * 60);
            this.nextEventTime.innerHTML = `Peak thermal load arriving in ${mins} min`;
        } else if (time >= 15 && time < 19) {
            const mins = Math.floor((19 - time) * 60);
            this.nextEventTime.innerHTML = `HVAC entering standby mode in ${mins} min`;
        } else {
            this.nextEventTime.innerHTML = `Nighttime thermal decay active`;
        }

        // --- BACKEND INTEGRATION STATE ---
        this.currentState = {
            timeOfDay: time,
            dayOfYear: day,
            weather: this.weatherData,
            occupants: occupancy,
            rawEnvironmentalTempCelsius: rawIndoorTemp,
            indoorAvgCelsius: indoorTemp,
            targetTempCelsius: targetTemp,
            controllerMode: this.activeMode,
            predictedHeatLoadKW: totalHeatLoadKw,
            hvacPowerPercentage: powerPct,
            heatExchangeKW: exchangeKw,
            hvacModeActive: exchangeKw < -0.1 ? 'COOLING' : (exchangeKw > 0.1 ? 'HEATING' : 'STANDBY'),
            qVectors: {
                solarKw: qSolarKw,
                occupancyKw: qOccupancyKw,
                envelopeKw: qEnvelopeKw,
                decayKw: qDecayKw,
                totalKw: totalHeatLoadKw,
                solarPct, occPct, envPct, decayPct
            },
            energyTracking: {
                smartKwh: this.smartEnergyKwh,
                baselineKwh: this.baselineEnergyKwh,
                savingsPercent: this.baselineEnergyKwh > 0 
                    ? ((this.baselineEnergyKwh - this.smartEnergyKwh) / this.baselineEnergyKwh * 100) 
                    : 0,
            }
        };

        document.dispatchEvent(new CustomEvent('simulationUpdated', { 
            detail: this.currentState 
        }));
    }
}
