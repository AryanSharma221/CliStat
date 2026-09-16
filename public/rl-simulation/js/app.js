// js/app.js
// =============================================================================
// MERGED VERSION: Uses real system time for sun position and 3D physics.
// ML predictions come via mlBridge.js polling the FastAPI backend.
// =============================================================================

document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize Viewer
    const viewer = new OfficeViewer('canvas-container');

    // 2. Build 3D Model from Config Data
    const builder = new HouseBuilder(viewer.scene);
    const envSelect = document.getElementById('environment-select');
    const anomalyBtn = document.getElementById('trigger-anomaly');
    let activeAnomaly = false;
    if (anomalyBtn) {
        anomalyBtn.addEventListener('click', () => {
            activeAnomaly = !activeAnomaly;
            anomalyBtn.style.background = activeAnomaly ? '#ff5252' : 'transparent';
            anomalyBtn.style.color = activeAnomaly ? '#fff' : '#ff5252';
            anomalyBtn.textContent = activeAnomaly ? '⚠️ Window Broken!' : '⚠️ Simulate Open Window';
        });
    }
    if (envSelect) {
        builder.build(envSelect.value);
        envSelect.addEventListener('change', (e) => {
            builder.build(e.target.value);
            console.log("Switched layout to", e.target.value);
        });
    } else {
        builder.build('office');
    }

    // 3. Initialize Environmental Simulation with REAL TIME
    const simulation = new EnvironmentSimulation(viewer.scene);
    
    // Set simulation to real system time
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now - startOfYear) / (1000 * 60 * 60 * 24));
    simulation.params.timeOfDay = now.getHours() + now.getMinutes() / 60.0;
    simulation.params.dayOfYear = dayOfYear;
    simulation.updateSunPosition();

    // 4. Initialize UI
    const ui = new UIController(simulation);
    
    // 5. Initialize AI & Sensor Network
    const pidController = typeof FeedForwardPIDController !== 'undefined' ? new FeedForwardPIDController(3.0, 0.1, 0.5, 1.2) : null;
    const mpcController = typeof ModelPredictiveController !== 'undefined' ? new ModelPredictiveController(60, 12) : null;
    const standardController = typeof BangBangController !== 'undefined' ? new BangBangController(0.5) : null;
    
    const sensorNetwork = typeof IoTSensorNetwork !== 'undefined' && typeof CONFIG !== 'undefined' ? new IoTSensorNetwork(CONFIG.ROOMS) : null;
    const sensorFusion = typeof MultiSensorFusion !== 'undefined' && typeof CONFIG !== 'undefined' ? new MultiSensorFusion(CONFIG.ROOMS) : null;
    const anomalyDetector = typeof AnomalyDetector !== 'undefined' ? new AnomalyDetector() : null;

    // 6. Main Game/Animation Loop
    const clock = new THREE.Clock();
    let frameCount = 0;

    function animate() {
        requestAnimationFrame(animate);
        
        const dt = clock.getDelta();
        frameCount++;
        
        // Update UI (uses real system time internally)
        ui.update(dt);
        
        // --- TRUE DIGITAL TWIN AI LOOP ---
        try {
            const rooms = typeof CONFIG !== 'undefined' ? CONFIG.ROOMS : [];
            if (rooms.length > 0) {
                // Use real system time for sun calculations
                const realNow = new Date();
                const time = realNow.getHours() + realNow.getMinutes() / 60.0;
                const realStartOfYear = new Date(realNow.getFullYear(), 0, 0);
                const realDayOfYear = Math.floor((realNow - realStartOfYear) / (1000 * 60 * 60 * 24));
                const lat = simulation.params.latitude;

                // Update simulation time to real time
                simulation.params.timeOfDay = time;
                simulation.params.dayOfYear = realDayOfYear;

                // Solar Math
                let sunIntensity = 0;
                let intersections = [];
                if (typeof getSunAngle !== 'undefined') {
                    const sunAngles = getSunAngle(time, realDayOfYear, lat);
                    sunIntensity = (typeof getSunIntensity !== 'undefined') ? getSunIntensity(time, 10) : 0;

                    if (typeof generateSunRays3D !== 'undefined' && typeof detectAllIntersections3D !== 'undefined') {
                        const rays = generateSunRays3D(sunAngles, rooms);
                        const flatObjs = (typeof flattenObjects !== 'undefined') ? flattenObjects(rooms) : [];
                        intersections = detectAllIntersections3D(rays, flatObjs);
                    }
                }

                // Calculate Q_predicted (5-vectors)
                let qData = null;
                if (typeof calculateQPredictedAllRooms !== 'undefined') {
                    const weather = { outdoorTempC: 30, humidity: 45, hourOfDay: time };
                    const occModel = (typeof defaultOccupancyModel !== 'undefined') ? defaultOccupancyModel : null;
                    qData = calculateQPredictedAllRooms(intersections, sunIntensity, occModel, weather, rooms, dt);
                }

                // Check if ML model is driving HVAC
                const isMLActive = (ui.activeMode === 'predictive' && ui.mlPowerPct !== null);

                // Read IoT Sensors & run Kalman Filter
                let fusedEstimates = {};
                let hvacState = {};
                if (sensorNetwork && sensorNetwork.readAll) {
                    const rawReadings = sensorNetwork.readAll(rooms, hvacState, null);
                    if (sensorFusion && sensorFusion.fuseMeasurements) {
                        fusedEstimates = sensorFusion.fuseMeasurements(rawReadings);
                    }
                }

                let totalPower = 0;
                let avgTemp = 0;
                let avgTarget = 0;

                // Controller Loop
                rooms.forEach(room => {
                    const qTotal = (qData && qData.perRoom && qData.perRoom[room.id]) ? qData.perRoom[room.id].total : 0;
                    const currentTempC = fusedEstimates[room.id] !== undefined ? fusedEstimates[room.id] : room.tempC;
                    
                    let power = 0;
                    if (isMLActive) {
                        // Use ML prediction
                        power = ui.mlPowerPct;
                    } else if (ui.activeMode === 'predictive' && pidController) {
                        power = pidController.compute(currentTempC, room.targetTempC, qTotal, dt);
                    } else if (standardController) {
                        power = standardController.compute(currentTempC, room.targetTempC, dt);
                    }

                    hvacState[room.id] = power;
                    totalPower += power;
                    avgTemp += room.tempC;
                    avgTarget += room.targetTempC;
                });
                
                const roomCount = rooms.length > 0 ? rooms.length : 1;
                avgTemp /= roomCount;
                avgTarget /= roomCount;

                // Run Multi-Room Thermodynamics
                if (typeof updateMultiRoomTemperatures !== 'undefined' && CONFIG.CONNECTIONS) {
                    const qPerRoom = {};
                    rooms.forEach(r => qPerRoom[r.id] = (qData && qData.perRoom[r.id]) ? qData.perRoom[r.id].total : 0);
                    if (activeAnomaly && rooms.length > 0) {
                        qPerRoom[rooms[0].id] += 80000;
                    }
                    updateMultiRoomTemperatures(rooms, CONFIG.CONNECTIONS, qPerRoom, hvacState, dt);
                }
                
                // --- PUSH DATA TO UI ---
                if (window.SimulationAPI && window.SimulationAPI.overrideHVAC && frameCount % 5 === 0 && !isMLActive) {
                    const avgPower = totalPower / roomCount;
                    const exchangeKw = -1 * (avgPower / 100) * 5.0;
                    const modeLabel = ui.activeMode === 'predictive' ? 'PID Predictive (fallback)' : 'Standard Reactive';
                    
                    window.SimulationAPI.overrideHVAC(avgPower, exchangeKw, modeLabel);
                    
                    const tempEl = document.getElementById('indoor-avg');
                    if (tempEl) tempEl.innerHTML = avgTemp.toFixed(1) + '<span class="unit">&deg;C</span>';
                    
                    const devVal = document.getElementById('deviation-val');
                    if (devVal) {
                        const devC = avgTemp - avgTarget;
                        const sign = devC > 0 ? '+' : '';
                        devVal.textContent = sign + devC.toFixed(1);
                    }
                }

                // Update Q-vectors
                if (qData && qData.totals && frameCount % 15 === 0) {
                    const t = qData.totals;
                    const total = Math.abs(t.total) || 1;
                    const setEl = (id, val) => {
                        const el = document.getElementById(id);
                        if (el) el.textContent = `${Math.round((val / total) * 100)}%`;
                    };
                    setEl('vec-solar', Math.abs(t.solar));
                    setEl('vec-occ', Math.abs(t.occupancy));
                    setEl('vec-env', Math.abs(t.envelope));
                    setEl('vec-decay', Math.abs(t.decay));
                }
            }
        } catch (e) {
            if (frameCount % 300 === 0) console.warn("AI tick error:", e);
        }

        // Render Scene
        viewer.render();
    }

    animate();
});
