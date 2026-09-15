// js/ui.js

class UIController {
    constructor(simulation) {
        this.simulation = simulation;
        
        // Define settings
        this.settings = {
            time: 12.0,
            season: 'Summer',
            latitude: 37.77,
            animateTime: true,  
            timeSpeed: 1 / 60   
        };

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

        // New Telemetry Elements
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

        // New Occupancy and Weather Elements
        this.occupancySlider = document.getElementById('occupancy-slider');
        this.occupancyVal = document.getElementById('occupancy-val');
        this.weatherStatus = document.getElementById('weather-status');

        // Init initial button state
        this.playPauseBtn.textContent = this.settings.animateTime ? '⏸' : '▶';

        // Init settings defaults
        this.settings.occupancy = 0;
        this.weatherData = { tempF: null, condition: 'Loading...', cloudCover: 0 };
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
            this.updateStats();
        });

        // Season
        this.seasonSelect.addEventListener('change', (e) => {
            const v = e.target.value;
            const days = { 'Spring': 80, 'Summer': 172, 'Fall': 266, 'Winter': 355 };
            this.simulation.params.dayOfYear = days[v];
            this.updateStats();
        });

        // Mode Toggles
        this.modePredictive.addEventListener('click', () => {
            this.modePredictive.classList.add('active');
            this.modeStandard.classList.remove('active');
        });

        this.modeStandard.addEventListener('click', () => {
            this.modeStandard.classList.add('active');
            this.modePredictive.classList.remove('active');
        });
    }

    update(dt) {
        if (this.settings.animateTime) {
            this.settings.time += dt * this.settings.timeSpeed;
            if (this.settings.time >= 24) this.settings.time = 0;
            this.simulation.params.timeOfDay = this.settings.time;
            this.updateStats();
        }
    }

    updateStats() {
        this.simulation.updateSunPosition();
        
        const time = this.settings.time;

        // Update Time display
        const h = Math.floor(time);
        const m = Math.floor((time - h) * 60);
        this.clockDisplay.textContent = 
            `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            
        this.timeSlider.value = time;
        
        // --- Thermodynamic Logic ---
        const targetTemp = parseFloat(this.targetTempSlider.value);
        const day = this.simulation.params.dayOfYear;
        
        // Base Temp by Season OR Live Weather
        let baseTemp = 21.0; 
        if (this.weatherData && this.weatherData.tempC !== undefined && this.weatherData.tempC !== null) {
            baseTemp = this.weatherData.tempC; // Start with real weather API (Celsius)
            
            // Apply artificial seasonal modifiers so the dropdown still functions!
            if (day >= 150 && day <= 240) baseTemp += 4.5; // Summer: even hotter
            else if (day < 60 || day > 300) baseTemp -= 11.0; // Winter: artificial cooling
            else baseTemp -= 3.0; // Spring/Fall: mild
            
        } else {
            if (day >= 150 && day <= 240) baseTemp = 26.0; // Summer
            else if (day < 60 || day > 300) baseTemp = 15.0; // Winter
        }

        // Solar Gain (Peaks around 14:00)
        let solarGain = 0;
        if (time > 7 && time < 21) {
            solarGain = Math.sin((time - 7) / 14 * Math.PI) * 6.6; // Max +6.6C from sun
            const peakDiff = Math.abs(time - 14.0);
            solarGain = Math.max(0, 8.0 - peakDiff * 1.5);
            
            // Apply Live Cloud Cover from API (Clouds reduce solar gain by up to 70%)
            if (this.weatherData && this.weatherData.cloudCover !== undefined) {
                solarGain *= (1.0 - (this.weatherData.cloudCover / 100) * 0.7);
            }
        }
        
        // Occupancy Heat Gain (+0.14C per person)
        const occGain = this.settings.occupancy * 0.14;

        // Raw environmental temperature before HVAC
        const rawIndoorTemp = baseTemp + solarGain + occGain;

        // HVAC System Thermodynamic Capacity
        const rawDeviation = rawIndoorTemp - targetTemp;
        const maxHvacDelta = 10.0; // HVAC can change temp by max 10 degrees C
        
        let actualHvacDelta = 0;
        if (Math.abs(rawDeviation) <= maxHvacDelta) {
            actualHvacDelta = rawDeviation;
        } else {
            actualHvacDelta = Math.sign(rawDeviation) * maxHvacDelta;
        }

        const indoorTemp = rawIndoorTemp - actualHvacDelta;
        this.indoorAvg.innerHTML = indoorTemp.toFixed(1) + '<span class="unit">&deg;C</span>';

        // Actual remaining deviation (if HVAC failed, this will be non-zero)
        const finalDeviation = indoorTemp - targetTemp;
        const sign = finalDeviation > 0 ? '+' : (finalDeviation < 0 ? '-' : '');
        this.deviationVal.textContent = sign + Math.abs(finalDeviation).toFixed(1);

        // Heat Load: Solar + Occupants
        const heatLoadKw = (solarGain / 8.0) * 8.5 + (this.settings.occupancy * 0.15); 
        this.heatLoad.innerHTML = heatLoadKw.toFixed(2) + '<span class="unit">kW</span>';

        // Heat Exchange & Power
        const exchangeKw = - (actualHvacDelta * 1.08); // 1.08 kW per degree C
        this.heatExchange.innerHTML = (exchangeKw > 0 ? '+' : '') + exchangeKw.toFixed(2) + '<span class="unit">kW</span>';

        if (exchangeKw < -0.1) {
            this.heatExchange.className = 'text-accent'; // Cooling
            this.hvacMode.innerHTML = `cooling active (${this.weatherData.condition}) &bull; zone 01`;
        } else if (exchangeKw > 0.1) {
            this.heatExchange.className = 'text-warning'; // Heating
            this.hvacMode.innerHTML = `heating active (${this.weatherData.condition}) &bull; zone 01`;
        } else {
            this.heatExchange.className = 'text-success'; // Standby
            this.hvacMode.innerHTML = 'hvac standby &bull; optimal';
        }

        const powerPct = (Math.abs(actualHvacDelta) / maxHvacDelta) * 100;
        this.hvacPower.innerHTML = Math.round(powerPct) + '<span class="unit">%</span>';

        // --- Q PREDICTED / VECTORS ---
        const solarPct = Math.min(100, (solarGain / 8.0) * 100);
        const occPct = Math.min(100, (this.settings.occupancy / 20.0) * 100);
        const envPct = Math.min(100, Math.abs(finalDeviation) * 9.0); // 9% per deg C
        const decayPct = 5 + Math.random() * 2; // Micro jitter for realism

        this.vecSolar.textContent = Math.round(solarPct) + '%';
        this.vecOcc.textContent = Math.round(occPct) + '%';
        this.vecEnv.textContent = Math.round(envPct) + '%';
        this.vecDecay.textContent = Math.round(decayPct) + '%';

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

        // --- BACKEND INTEGRATION ---
        this.currentState = {
            timeOfDay: time,
            dayOfYear: day,
            weather: this.weatherData,
            occupants: this.settings.occupancy,
            rawEnvironmentalTempCelsius: rawIndoorTemp, // Unmitigated baseline needed for MPC prediction
            indoorAvgCelsius: indoorTemp,
            targetTempCelsius: targetTemp,
            predictedHeatLoadKW: heatLoadKw,
            hvacPowerPercentage: powerPct,
            heatExchangeKW: exchangeKw,
            hvacModeActive: exchangeKw < -0.1 ? 'COOLING' : (exchangeKw > 0.1 ? 'HEATING' : 'STANDBY'),
            qVectors: {
                solarRadiationPct: solarPct,
                occupancyGainPct: occPct,
                envelopeDriftPct: envPct,
                thermalDecayPct: decayPct
            }
        };

        // Emit an event so external frameworks (React, Vue, Vanilla) can listen easily
        document.dispatchEvent(new CustomEvent('simulationUpdated', { 
            detail: this.currentState 
        }));
    }
}
