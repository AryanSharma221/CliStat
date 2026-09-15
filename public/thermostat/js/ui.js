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
            overrideHVAC: (powerPct, exchangeKw, modeString) => {
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

        // Init initial button state
        this.playPauseBtn.textContent = this.settings.animateTime ? '⏸' : '▶';

        // Init settings defaults
        this.settings.occupancy = 0;
        this.weatherData = { tempC: null, condition: 'Loading...', cloudCover: 0 };
        this.fetchWeather();
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
        this.modePredictive.addEventListener('click', () => {
            this.activeMode = 'predictive';
            this.modePredictive.classList.add('active');
            this.modeStandard.classList.remove('active');
            this.hvacController.reset();
            // Reset counters to show fresh comparison
            this.smartEnergyKwh = 0; this.baselineEnergyKwh = 0;
            this.smartCostRupees = 0; this.baselineCostRupees = 0;
            this.smartCO2Kg = 0; this.baselineCO2Kg = 0;
            this.lastSimTime = null;
        });

        this.modeStandard.addEventListener('click', () => {
            this.activeMode = 'standard';
            this.modeStandard.classList.add('active');
            this.modePredictive.classList.remove('active');
            // Reset counters to show fresh comparison
            this.smartEnergyKwh = 0; this.baselineEnergyKwh = 0;
            this.smartCostRupees = 0; this.baselineCostRupees = 0;
            this.smartCO2Kg = 0; this.baselineCO2Kg = 0;
            this.lastSimTime = null;
        });
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
        
        // Indoor Average
        this.indoorAvg.innerHTML = indoorTemp.toFixed(1) + '<span class="unit">&deg;C</span>';

        // Deviation
        const finalDeviation = indoorTemp - targetTemp;
        const sign = finalDeviation > 0 ? '+' : (finalDeviation < 0 ? '-' : '');
        this.deviationVal.textContent = sign + Math.abs(finalDeviation).toFixed(1);

        // Predicted Heat Load
        this.heatLoad.innerHTML = totalHeatLoadKw.toFixed(2) + '<span class="unit">kW</span>';

        // Heat Exchange
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
