// js/ui.js
// =============================================================================
// MEMBER 3 — 3D Visualization & UI Controller
// -----------------------------------------------------------------------------
// Drives the dashboard telemetry, thermodynamic simulation loop, and wires
// Aryan's AI controllers (PID, BangBang) into the live physics engine.
// =============================================================================

class UIController {
    constructor(simulation) {
        this.simulation = simulation;
        
        // Define settings
        this.settings = {
            time: 12.0,
            season: 'Summer',
            latitude: 13.08,       // Chennai latitude
            animateTime: true,  
            timeSpeed: 1 / 60      // 1 real second = 1 sim minute
        };

        // --- CONTROLLER MODE ---
        this.activeMode = 'predictive'; // 'predictive' (PID+FF) or 'standard' (BangBang)
        this.hvacController = new FeedForwardPIDController(1.5, 0.1, 0.05, 0.2);
        this.bangbangController = new BangBangController(0.5);

        // --- ENERGY / COST / CO2 TRACKING ---
        this.maxHvacCapacityKw = 5.0;  // CONFIG.PHYSICS.HVAC_COOLING_POWER
        this.gridCarbonIntensity = 0.82; // kg CO2/kWh — India grid average
        this.smartEnergyKwh = 0;
        this.baselineEnergyKwh = 0;
        this.smartCostRupees = 0;
        this.baselineCostRupees = 0;
        this.smartCO2Kg = 0;
        this.baselineCO2Kg = 0;
        this.lastSimTime = null;      // for delta tracking

        this.bindElements();
        this.addEventListeners();
        
        // Expose API for backend integration
        this._backendOverride = false; // flag: backend pushed HVAC data this frame
        window.SimulationAPI = {
            getState: () => this.currentState,
            setTargetTemp: (temp) => {
                this.targetTempSlider.value = temp;
                this.targetTempVal.textContent = parseFloat(temp).toFixed(1);
                this.updateStats();
            },
            setTime: (time) => {
                this.settings.time = time;
                this.updateStats();
            },
            setSeason: (seasonName) => {
                this.seasonSelect.value = seasonName;
                this.seasonSelect.dispatchEvent(new Event('change'));
            },
            // Allows backend MPC/PID controllers to override local frontend HVAC math
            overrideHVAC: (powerPct, exchangeKw, modeString, indoorAvgTemp, deviation) => {
                this._backendOverride = true;
                this.hvacPower.innerHTML = Math.round(powerPct) + '<span class="unit">%</span>';
                this.heatExchange.innerHTML = (exchangeKw > 0 ? '+' : '') + parseFloat(exchangeKw).toFixed(2) + '<span class="unit">kW</span>';
                this.hvacMode.innerHTML = modeString;
                
                if (exchangeKw < -0.1) this.heatExchange.className = 'text-accent';
                else if (exchangeKw > 0.1) this.heatExchange.className = 'text-warning';
                else this.heatExchange.className = 'text-success';

                if (indoorAvgTemp !== undefined && deviation !== undefined) {
                    this.indoorAvg.innerHTML = indoorAvgTemp.toFixed(1) + '<span class="unit">&deg;C</span>';
                    const sign = deviation > 0 ? '+' : (deviation < 0 ? '-' : '');
                    this.deviationVal.textContent = sign + Math.abs(deviation).toFixed(1);
                }
            }
        };

        this.updateStats();
    }

    bindElements() {
        this.timeSlider = document.getElementById('time-slider');
        this.clockDisplay = document.getElementById('clock-display');
        this.seasonSelect = document.getElementById('season-select');
        this.playPauseBtn = document.getElementById('play-pause-btn');
        this.rewindBtn = document.getElementById('rewind-btn');
        this.forwardBtn = document.getElementById('forward-btn');
        this.resetBtn = document.getElementById('reset-btn');
        
        this.modePredictive = document.getElementById('mode-predictive');
        this.modeStandard = document.getElementById('mode-standard');
        
        this.nextEventTime = document.getElementById('next-event-time');

        // Telemetry Elements
        this.targetTempSlider = document.getElementById('target-temp-slider');
        this.targetTempVal = document.getElementById('target-temp-val');
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
        this.occupancySlider = document.getElementById('occupancy-slider');
        this.occupancyVal = document.getElementById('occupancy-val');
        this.weatherStatus = document.getElementById('weather-status');

        // New: Savings & Carbon Elements
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

        // Init initial button state
        this.playPauseBtn.textContent = this.settings.animateTime ? '⏸' : '▶';

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
            
            this.weatherStatus.innerHTML = `${this.weatherData.tempC.toFixed(1)}&deg;C &bull; ${this.weatherData.condition} (${this.weatherData.cloudCover}% clouds)`;
            this.updateStats();
        } catch (e) {
            console.error("Weather fetch failed:", e);
            this.weatherStatus.innerHTML = `Error fetching API`;
        }
    }

    addEventListeners() {
        // Time Slider
        this.timeSlider.addEventListener('input', (e) => {
            this.settings.time = parseFloat(e.target.value);
            this.simulation.params.timeOfDay = this.settings.time;
            this.updateStats();
        });

        // Occupancy Slider
        this.occupancySlider.addEventListener('input', (e) => {
            this.settings.occupancy = parseInt(e.target.value);
            this.occupancyVal.textContent = this.settings.occupancy + ' people';
            this.updateStats();
        });

        // Target Temp Slider
        this.targetTempSlider.addEventListener('input', (e) => {
            this.targetTempVal.textContent = parseFloat(e.target.value).toFixed(1);
            this.updateStats();
        });

        // Play/Pause
        this.playPauseBtn.addEventListener('click', () => {
            this.settings.animateTime = !this.settings.animateTime;
            this.playPauseBtn.textContent = this.settings.animateTime ? '⏸' : '▶';
        });

        // Fast Forward
        this.forwardBtn.addEventListener('click', () => {
            this.settings.time = (this.settings.time + 1) % 24;
            this.simulation.params.timeOfDay = this.settings.time;
            this.updateStats();
        });

        // Rewind
        this.rewindBtn.addEventListener('click', () => {
            this.settings.time = this.settings.time - 1;
            if (this.settings.time < 0) this.settings.time += 24;
            this.simulation.params.timeOfDay = this.settings.time;
            this.updateStats();
        });

        // Reset
        this.resetBtn.addEventListener('click', () => {
            this.settings.time = 12.0;
            this.settings.animateTime = false;
            this.playPauseBtn.textContent = '▶';
            this.simulation.params.timeOfDay = 12.0;
            // Reset energy counters
            this.smartEnergyKwh = 0; this.baselineEnergyKwh = 0;
            this.smartCostRupees = 0; this.baselineCostRupees = 0;
            this.smartCO2Kg = 0; this.baselineCO2Kg = 0;
            this.lastSimTime = null;
            this.hvacController.reset();
            this.updateStats();
        });

        // Season
        this.seasonSelect.addEventListener('change', (e) => {
            const v = e.target.value;
            const days = { 'Spring': 80, 'Summer': 172, 'Fall': 266, 'Winter': 355 };
            this.simulation.params.dayOfYear = days[v];
            this.updateStats();
        });

        // Mode Toggles — NOW ACTUALLY SWITCH CONTROLLERS
        if (this.modePredictive) {
            this.modePredictive.addEventListener('click', () => {
                this.activeMode = 'predictive';
                this.modePredictive.classList.add('active');
                this.hvacController.reset();
                // Reset counters to show fresh comparison
                this.smartEnergyKwh = 0; this.baselineEnergyKwh = 0;
                this.smartCostRupees = 0; this.baselineCostRupees = 0;
                this.smartCO2Kg = 0; this.baselineCO2Kg = 0;
                this.lastSimTime = null;
            });
        }
    }

    update(dt) {
        if (this.settings.animateTime) {
            this.settings.time += dt * this.settings.timeSpeed;
            if (this.settings.time >= 24) {
                this.settings.time = 0;
                // Reset counters on day rollover
                this.smartEnergyKwh = 0; this.baselineEnergyKwh = 0;
                this.smartCostRupees = 0; this.baselineCostRupees = 0;
                this.smartCO2Kg = 0; this.baselineCO2Kg = 0;
            }
            this.simulation.params.timeOfDay = this.settings.time;
            this.updateStats(true); // true = animation frame (accumulate energy)
        }
    }

    updateStats(isAnimationFrame = false) {
        this.simulation.updateSunPosition();
        
        const time = this.settings.time;

        // Update Time display
        const h = Math.floor(time);
        const m = Math.floor((time - h) * 60);
        this.clockDisplay.textContent = 
            `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        this.timeSlider.value = time;
        
        // =====================================================================
        //  THERMODYNAMIC ENGINE
        // =====================================================================
        const targetTemp = parseFloat(this.targetTempSlider.value);
        const day = this.simulation.params.dayOfYear;
        
        // --- 1. BASE TEMPERATURE (Weather API + Seasonal Modifier) ---
        let baseTemp = 21.0; 
        if (this.weatherData && this.weatherData.tempC !== undefined && this.weatherData.tempC !== null) {
            baseTemp = this.weatherData.tempC;
            if (day >= 150 && day <= 240) baseTemp += 4.5;       // Summer: hotter
            else if (day < 60 || day > 300) baseTemp -= 11.0;    // Winter: cooler
            else baseTemp -= 3.0;                                  // Spring/Fall: mild
        } else {
            if (day >= 150 && day <= 240) baseTemp = 26.0;
            else if (day < 60 || day > 300) baseTemp = 15.0;
        }

        // --- 2. SOLAR GAIN (5-vector Q_predicted approach) ---
        // Use getSunIntensity() from sun.js for cloud-attenuated solar curve
        const cloudCover = (this.weatherData && this.weatherData.cloudCover) || 0;
        const sunIntensity = getSunIntensity(time, cloudCover);
        
        // Solar heat gain through windows (simplified: 2 windows × 4m² × 0.4 SHGC)
        const windowArea = 8.0;  // m² total glazing
        const SHGC = 0.4;       // Solar Heat Gain Coefficient
        const solarIrradiance = 1000; // W/m² peak (standard)
        const qSolarKw = sunIntensity * windowArea * SHGC * solarIrradiance / 1000;

        // --- 3. OCCUPANCY HEAT GAIN (ASHRAE 55: 120W per person) ---
        const qOccupancyKw = this.settings.occupancy * 0.12; // kW (CONFIG.PHYSICS.ASHRAE_METABOLIC_HEAT)

        // --- 4. ENVELOPE LOAD (heat leaking through walls from outdoor temp) ---
        const outdoorTemp = baseTemp;
        const U_envelope = 0.35;   // W/(m²·K) — CONFIG.PHYSICS.U_ENVELOPE
        const A_envelope = 45;     // m² — CONFIG.PHYSICS.A_ENVELOPE
        const deltaT_envelope = Math.max(0, outdoorTemp - targetTemp);
        const qEnvelopeKw = (U_envelope * A_envelope * deltaT_envelope) / 1000;

        // --- 5. THERMAL DECAY (stored heat re-radiating from furniture) ---
        const qDecayKw = qSolarKw * 0.08; // 8% of solar load re-radiates as stored heat

        // --- TOTAL PREDICTED HEAT LOAD ---
        const totalHeatLoadKw = qSolarKw + qOccupancyKw + qEnvelopeKw + qDecayKw;
        
        // Convert kW heat load → temperature rise using building heat loss coefficient
        // A typical building loses ~0.5 kW per °C of indoor-outdoor difference
        // (includes walls, windows, ventilation, infiltration)
        const buildingHeatLossCoeff = 0.5; // kW/°C
        const totalGainDegC = totalHeatLoadKw / buildingHeatLossCoeff;
        
        // Raw indoor temperature before any HVAC intervention
        const rawIndoorTemp = baseTemp + totalGainDegC;

        // =====================================================================
        //  HVAC CONTROLLER (Active mode: PID+FF or BangBang)
        // =====================================================================
        const rawDeviation = rawIndoorTemp - targetTemp;
        const maxHvacDelta = 10.0; // Physical ceiling: HVAC can alter temp by max 10°C
        
        // Compute simulation dt for PID (avoid using hardcoded 1/60)
        let simDt = 1.0 / 60.0; // default
        if (isAnimationFrame && this.lastSimTime !== null) {
            simDt = Math.max(0.001, this.settings.time - this.lastSimTime);
            if (simDt > 1.0) simDt = 1.0 / 60.0; // guard against time jumps/wraps
        }

        // --- ACTIVE CONTROLLER ---
        let powerPct;
        let controllerLabel;
        if (this.activeMode === 'predictive') {
            powerPct = this.hvacController.compute(rawIndoorTemp, targetTemp, totalHeatLoadKw, simDt);
            controllerLabel = 'PID + Feed-Forward';
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
        //  ENERGY / COST / CO2 ACCUMULATION (only during animation)
        // =====================================================================
        if (isAnimationFrame && this.lastSimTime !== null) {
            const dtHours = Math.max(0, Math.min(simDt, 0.5)); // hours of simulation time
            
            // Time-of-Use pricing (Indian grid rates)
            const isPeak = (time >= 16 && time <= 21);
            const ratePerKwh = isPeak ? 8.0 : 4.5; // ₹/kWh
            
            // Smart controller energy
            const smartPowerKw = (powerPct / 100) * this.maxHvacCapacityKw;
            this.smartEnergyKwh += smartPowerKw * dtHours;
            this.smartCostRupees += smartPowerKw * dtHours * ratePerKwh;
            this.smartCO2Kg += smartPowerKw * dtHours * this.gridCarbonIntensity;
            
            // Baseline (BangBang) energy — what a dumb thermostat would use
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
        
        // Indoor Average & Deviation — only write if backend hasn't taken over
        if (!this._backendOverride) {
            this.indoorAvg.innerHTML = indoorTemp.toFixed(1) + '<span class="unit">&deg;C</span>';
            const finalDeviation = indoorTemp - targetTemp;
            const sign = finalDeviation > 0 ? '+' : (finalDeviation < 0 ? '-' : '');
            this.deviationVal.textContent = sign + Math.abs(finalDeviation).toFixed(1);
        }

        // Predicted Heat Load
        this.heatLoad.innerHTML = totalHeatLoadKw.toFixed(2) + '<span class="unit">kW</span>';

        // Heat Exchange, HVAC Mode, HVAC Power — only write if backend hasn't already
        if (!this._backendOverride) {
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

            // HVAC Power
            this.hvacPower.innerHTML = Math.round(powerPct) + '<span class="unit">%</span>';
        }
        // DON'T reset _backendOverride — once the backend takes over, it owns these elements permanently

        // --- CARBON FOOTPRINT (dynamic) ---
        if (this.carbonRate) {
            const currentCarbonKgH = (powerPct / 100) * this.maxHvacCapacityKw * this.gridCarbonIntensity;
            this.carbonRate.innerHTML = currentCarbonKgH.toFixed(2) + '<span class="unit">kg/h</span>';
            this.carbonRate.className = currentCarbonKgH > 2.0 ? 'text-warning' : (currentCarbonKgH > 0.5 ? '' : 'text-success');
            if (this.carbonStatus) {
                this.carbonStatus.textContent = (time >= 16 && time <= 21) ? 'peak hours ⚡' : 'off-peak 🌿';
            }
        }

        // --- ENERGY SAVINGS vs BASELINE ---
        if (this.savingsPct && this.baselineEnergyKwh > 0.001) {
            const savingsPercent = ((this.baselineEnergyKwh - this.smartEnergyKwh) / this.baselineEnergyKwh) * 100;
            const displayPct = Math.round(savingsPercent);
            this.savingsPct.innerHTML = (displayPct >= 0 ? '-' : '+') + Math.abs(displayPct) + '<span class="unit">%</span>';
            this.savingsPct.className = displayPct >= 0 ? 'text-success' : 'text-warning';
        } else if (this.savingsPct) {
            this.savingsPct.innerHTML = '0<span class="unit">%</span>';
        }
        if (this.smartKwh) this.smartKwh.textContent = this.smartEnergyKwh.toFixed(3);
        if (this.baselineKwh) this.baselineKwh.textContent = this.baselineEnergyKwh.toFixed(3);
        if (this.costSaved) {
            const saved = this.baselineCostRupees - this.smartCostRupees;
            this.costSaved.textContent = Math.max(0, saved).toFixed(2);
        }
        if (this.co2Avoided) {
            const avoided = this.baselineCO2Kg - this.smartCO2Kg;
            this.co2Avoided.textContent = Math.max(0, avoided).toFixed(3);
        }

        // --- Q PREDICTED / VECTORS (Proportional, summing to ~100%) ---
        const qTotal = totalHeatLoadKw || 0.001; // avoid div by zero
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
            if (this.activeMode === 'predictive' && this.hvacController.lastError !== undefined) {
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
                    <div><b>Baseline:</b> ${baselinePower}% ${baselinePower > powerPct ? '⬆️ +' + (baselinePower - powerPct).toFixed(0) + '%' : baselinePower < powerPct ? '⬇️' : '='}</div>
                    <div style="margin-top:4px;color:${finalDeviation > 1 ? '#f97316' : '#22c55e'}"><b>Status:</b> ${Math.abs(finalDeviation) < 0.5 ? '✅ At setpoint' : (powerPct >= 99 ? '⚠️ HVAC at capacity' : '🔄 Converging...')}</div>
                `;
            } else {
                traceHtml = `
                    <div><b>Sensor:</b> env=${rawIndoorTemp.toFixed(1)}°C → target=${targetTemp.toFixed(1)}°C</div>
                    <div><b>Mode:</b> ${controllerLabel}</div>
                    <div style="margin:4px 0; padding:4px; background:rgba(248,113,113,0.08); border-radius:4px;">
                        <b>Decision:</b> ${powerPct > 0 ? 'ON (100%)' : 'OFF (0%)'}
                    </div>
                    <div><b>Hysteresis:</b> ±0.5°C deadband</div>
                    <div><b>PID would use:</b> ${this.hvacController.compute(rawIndoorTemp, targetTemp, totalHeatLoadKw, simDt).toFixed(0)}%</div>
                    <div style="margin-top:4px;color:${finalDeviation > 1 ? '#f97316' : '#22c55e'}"><b>Status:</b> ${Math.abs(finalDeviation) < 0.5 ? '✅ At setpoint' : '🔄 Cycling...'}</div>
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
            const dim = (v) => `<span style="color:#64748b">${v}</span>`;
            
            const section = (title) => `<div style="color:#0ea5e9;font-weight:bold;margin:16px 0 6px;border-bottom:1px solid #1e293b;padding-bottom:4px;font-size:1.1em;">▸ ${title}</div>`;
            
            const apiTemp = (this.weatherData && this.weatherData.tempC != null) ? this.weatherData.tempC.toFixed(1) : 'N/A';
            const seasonMod = day >= 150 && day <= 240 ? '+4.5' : (day < 60 || day > 300 ? '-11.0' : '-3.0');
            
            this.formulasContent.innerHTML = `
                ${section('1. BASE TEMPERATURE')}
                <div>T_base = T_api + SeasonModifier</div>
                <div>T_base = ${s(apiTemp + '°C')} + ${s(seasonMod + '°C')} = ${w(baseTemp.toFixed(1) + '°C')}</div>
                
                ${section('2. SOLAR LOAD (Q_solar)')}
                <div>sunIntensity = getSunIntensity(${s(time.toFixed(1) + 'h')}, ${s(cloudCover + '%')})</div>
                <div>sunIntensity = ${w(sunIntensity.toFixed(3))}</div>
                <div style="margin-top:4px">Q_solar = intensity × WindowArea × SHGC × Irradiance</div>
                <div>Q_solar = ${s(sunIntensity.toFixed(3))} × ${s('8.0m²')} × ${s('0.4')} × ${s('1000W/m²')} / 1000</div>
                <div>Q_solar = ${w(qSolarKw.toFixed(3) + ' kW')}</div>

                ${section('3. OCCUPANCY LOAD (Q_occ)')}
                <div>${dim('ASHRAE 55: Seated person ≈ 120W metabolic heat')}</div>
                <div>Q_occ = Occupants × 0.12 kW/person</div>
                <div>Q_occ = ${s(this.settings.occupancy)} × 0.12 = ${w(qOccupancyKw.toFixed(3) + ' kW')}</div>

                ${section('4. ENVELOPE LOAD (Q_env)')}
                <div>Q_env = U × A × max(0, T_out - T_target) / 1000</div>
                <div>Q_env = ${s('0.35')} × ${s('45m²')} × max(0, ${s(outdoorTemp.toFixed(1))} - ${s(targetTemp.toFixed(1))}) / 1000</div>
                <div>Q_env = ${w(qEnvelopeKw.toFixed(3) + ' kW')}</div>

                ${section('5. THERMAL DECAY (Q_decay)')}
                <div>Q_decay = Q_solar × 0.08 ${dim('(8% re-radiation)')}</div>
                <div>Q_decay = ${s(qSolarKw.toFixed(3))} × 0.08 = ${w(qDecayKw.toFixed(3) + ' kW')}</div>

                ${section('6. TOTAL HEAT LOAD')}
                <div>Q_total = Q_solar + Q_occ + Q_env + Q_decay</div>
                <div>Q_total = ${s(qSolarKw.toFixed(2))} + ${s(qOccupancyKw.toFixed(2))} + ${s(qEnvelopeKw.toFixed(2))} + ${s(qDecayKw.toFixed(2))}</div>
                <div>Q_total = ${r(totalHeatLoadKw.toFixed(3) + ' kW')}</div>
                <div style="margin-top:4px">ΔT_gain = Q_total / BuildingHeatLoss</div>
                <div>ΔT_gain = ${s(totalHeatLoadKw.toFixed(2))} / ${s('0.5 kW/°C')} = ${w(totalGainDegC.toFixed(1) + '°C')}</div>

                ${section('7. RAW INDOOR TEMP (before HVAC)')}
                <div>T_raw = T_base + ΔT_gain</div>
                <div>T_raw = ${s(baseTemp.toFixed(1))} + ${s(totalGainDegC.toFixed(1))} = ${r(rawIndoorTemp.toFixed(1) + '°C')}</div>

                ${section('8. CONTROLLER: ' + controllerLabel.toUpperCase())}
                ${this.activeMode === 'predictive' && this.hvacController.lastError !== undefined ? `
                    <div>error = T_raw - T_target = ${s(rawIndoorTemp.toFixed(1))} - ${s(targetTemp.toFixed(1))} = ${w(this.hvacController.lastError.toFixed(2) + '°C')}</div>
                    <div style="margin-top:4px">P = Kp × error = ${s('1.5')} × ${s(this.hvacController.lastError.toFixed(2))} = ${w(this.hvacController.lastP.toFixed(2))}</div>
                    <div>I = Ki × Σ(e·dt) = ${s('0.1')} × ${s(this.hvacController.integral.toFixed(2))} = ${w(this.hvacController.lastI.toFixed(2))}</div>
                    <div>D = Kd × Δe/dt = ${w(this.hvacController.lastD.toFixed(2))}</div>
                    <div>FF = Kff × Q_pred = ${s('0.2')} × ${s(totalHeatLoadKw.toFixed(2))} = ${w(this.hvacController.lastFF.toFixed(2))}</div>
                    <div style="margin-top:4px">Output = clamp(P+I+D+FF, 0, 100)</div>
                    <div>Output = clamp(${s((this.hvacController.lastP + this.hvacController.lastI + this.hvacController.lastD + this.hvacController.lastFF).toFixed(1))}) = ${g(powerPct.toFixed(0) + '%')}</div>
                ` : `
                    <div>if T_current > target + 0.5: power = 100%</div>
                    <div>if T_current ≤ target - 0.5: power = 0%</div>
                    <div style="margin-top:4px">${s(rawIndoorTemp.toFixed(1) + '°C')} ${rawIndoorTemp > targetTemp + 0.5 ? '>' : '≤'} ${s((targetTemp + 0.5).toFixed(1) + '°C')} → Output = ${g(powerPct.toFixed(0) + '%')}</div>
                `}

                ${section('9. HVAC EFFECT')}
                <div>maxPull = 10.0 × (power/100) = 10.0 × ${s((powerPct/100).toFixed(2))} = ${w(maxHvacPull.toFixed(1) + '°C')}</div>
                <div>ΔT_hvac = min(|deviation|, maxPull) × sign</div>
                <div>ΔT_hvac = min(${s(Math.abs(rawDeviation).toFixed(1))}, ${s(maxHvacPull.toFixed(1))}) = ${w(actualHvacDelta.toFixed(1) + '°C')}</div>
                <div style="margin-top:4px">exchangeKw = -(ΔT × capacity/maxDelta)</div>
                <div>exchangeKw = -(${s(actualHvacDelta.toFixed(1))} × ${s('0.5')}) = ${w(exchangeKw.toFixed(2) + ' kW')}</div>

                ${section('10. FINAL RESULT')}
                <div>T_indoor = T_raw - ΔT_hvac</div>
                <div>T_indoor = ${s(rawIndoorTemp.toFixed(1))} - ${s(actualHvacDelta.toFixed(1))} = ${g(indoorTemp.toFixed(1) + '°C')}</div>
                <div style="margin-top:4px">Deviation from target: ${finalDeviation > 0.5 ? r(('+' + finalDeviation.toFixed(1)) + '°C') : g(finalDeviation.toFixed(1) + '°C')}</div>

                ${section('11. Q-VECTORS (proportional)')}
                <div>Solar:    ${s(qSolarKw.toFixed(2))} / ${s(totalHeatLoadKw.toFixed(2))} × 100 = ${w(Math.round(solarPct) + '%')}</div>
                <div>Occupancy:${s(qOccupancyKw.toFixed(2))} / ${s(totalHeatLoadKw.toFixed(2))} × 100 = ${w(Math.round(occPct) + '%')}</div>
                <div>Envelope: ${s(qEnvelopeKw.toFixed(2))} / ${s(totalHeatLoadKw.toFixed(2))} × 100 = ${w(Math.round(envPct) + '%')}</div>
                <div>Decay:    ${s(qDecayKw.toFixed(2))} / ${s(totalHeatLoadKw.toFixed(2))} × 100 = ${w(Math.round(decayPct) + '%')}</div>
                <div style="margin-top:4px;color:#64748b">Sum = ${Math.round(solarPct + occPct + envPct + decayPct)}%</div>
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
            occupants: this.settings.occupancy,
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
                smartCostRupees: this.smartCostRupees,
                baselineCostRupees: this.baselineCostRupees,
                smartCO2Kg: this.smartCO2Kg,
                baselineCO2Kg: this.baselineCO2Kg
            }
        };

        // Emit event for external frameworks
        document.dispatchEvent(new CustomEvent('simulationUpdated', { 
            detail: this.currentState 
        }));
    }
}
