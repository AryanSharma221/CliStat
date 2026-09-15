let simState = {};
let modules = {};

window.addEventListener('DOMContentLoaded', async () => {
    console.log("Booting Predictive Digital Twin...");
    
    const canvas = document.getElementById('sim-canvas');
    const ctx = canvas.getContext('2d');
    
    simState = {
        simulatedHour: 8,          
        simulatedTime: new Date().setHours(8, 0, 0, 0),
        dayOfYear: 172,            
        latitude: 37.7749,         
        frameCount: 0,
        dtSeconds: 0,
        rooms: JSON.parse(JSON.stringify(CONFIG.ROOMS)), 
        connections: CONFIG.ROOM_CONNECTIONS,
        weather: { outdoorTempF: 75, humidity: 45, cloud: 10, description: 'Clear' },
        activeAlerts: [],
        sensorReadings: [],
        fusedEstimate: { estimate: 72, uncertainty: 0 },
        qPredicted: { total: 0, solar: 0, occupancy: 0, envelope: 0, latent: 0, decay: 0 },
        predictiveMode: { hvacPower: {} },
        standardMode: { hvacPower: {}, roomTemps: {} },
        history: { timestamps: [], predictiveTempF: [], standardTempF: [], targetTempF: [], predictivePower: [], standardPower: [], qSolar: [], qOccupancy: [], qEnvelope: [], qHumidity: [], qDecay: [] },
        forecast: { threats: [] },
        blindCommands: []
    };
    
    simState.rooms.forEach(r => { simState.standardMode.roomTemps[r.id] = r.tempF; });

    modules.heatmap = new ThermalHeatmap(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    modules.controller = new FeedForwardPIDController(CONFIG.PID.Kp, CONFIG.PID.Ki, CONFIG.PID.Kd, CONFIG.PID.Kff);
    modules.stdController = new BangBangController();
    modules.blindController = new SmartBlindController(getAllWindows(simState.rooms));
    modules.sensors = new IoTSensorNetwork(5); 
    modules.fusion = new MultiSensorFusion(5);
    modules.anomaly = new AnomalyDetector();
    modules.occupancy = new StochasticOccupancyModel();
    modules.economics = new EconomicsTracker();
    modules.playback = new PlaybackEngine();
    modules.calibrator = new DigitalTwinCalibrator();
    modules.sankey = new SankeyDiagram('sankey-canvas');

    initCharts(modules);
    initControls(simState, modules);

    try {
        simState.weather = await fetchWeather(simState.latitude);
        document.getElementById('weather-badge').textContent = `${simState.weather.outdoorTempF}°F | ${simState.weather.description}`;
    } catch (err) {}

    let lastTime = performance.now();
    function loop(time) {
        simState.dtSeconds = calculateDt(time, lastTime) || 0.1;
        lastTime = time;
        simulationTick(ctx, simState, modules);
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
});

function simulationTick(ctx, state, modules) {
    state.simulatedHour += state.dtSeconds / 3600;
    if (state.simulatedHour >= 24) state.simulatedHour -= 24;

    const sunAngles = getSunAngle(state.simulatedHour, state.dayOfYear, state.latitude);
    const sunIntensity = getSunIntensity(state.simulatedHour, state.weather.cloud);
    state.sun = { elevation: sunAngles.elevation, azimuth: sunAngles.azimuth, intensity: sunIntensity };
    state.sun.rays = generateSunRays(sunAngles, getAllWindows(state.rooms));

    state.intersections = detectAllIntersections(state.sun.rays, getAllObjects(state.rooms));

    state.heatmap.injectHeat(getAllObjects(state.rooms), state.intersections);
    state.heatmap.diffuse();

    if (state.frameCount % 30 === 0) {
        state.forecast.threats = forecastThreats(state.simulatedHour, getAllObjects(state.rooms), getAllWindows(state.rooms));
    }

    state.blindCommands = modules.blindController.evaluate(state.forecast.threats, state.qPredicted, state.rooms);
    applyBlindCommands(state.rooms, state.blindCommands);

    state.qPredicted = calculateQPredicted(state.intersections, state.sun.intensity, modules.occupancy, state.weather, state.rooms, state.dtSeconds);

    state.sensorReadings = modules.sensors.readAll(state.rooms, state.heatmap, state.predictiveMode.hvacPower);
    state.fusedEstimate = modules.fusion.fuseMeasurements(state.rooms[0].tempF);

    for (const room of state.rooms) {
        const roomQ = calculateRoomQ(state.qPredicted, room.id);
        state.predictiveMode.hvacPower[room.id] = modules.controller.compute(room.tempF, room.targetTempF, roomQ, state.dtSeconds);
        state.standardMode.hvacPower[room.id] = modules.stdController.compute(state.standardMode.roomTemps[room.id] || room.tempF);
    }

    updateMultiRoomTemperatures(state.rooms, state.connections, state.predictiveMode.hvacPower, state.dtSeconds);
    
    const stdRoomsMock = JSON.parse(JSON.stringify(state.rooms));
    stdRoomsMock.forEach(r => { r.tempF = state.standardMode.roomTemps[r.id] || r.tempF; });
    updateMultiRoomTemperatures(stdRoomsMock, state.connections, state.standardMode.hvacPower, state.dtSeconds);
    stdRoomsMock.forEach(r => { state.standardMode.roomTemps[r.id] = r.tempF; });

    const alert = modules.anomaly.check(state.fusedEstimate.estimate, state.rooms[0].tempF, state.predictiveMode.hvacPower[state.rooms[0].id], state.qPredicted, state.weather);
    if (alert) state.activeAlerts.push(alert);

    for (const room of state.rooms) {
        modules.economics.update(state.simulatedHour, state.predictiveMode.hvacPower[room.id] || 0, state.standardMode.hvacPower[room.id] || 0, state.dtSeconds);
    }

    logDataPoint(state);

    render(ctx, state);
    updateCharts(modules, state.history, modules.economics);
    modules.sankey.render(state.qPredicted, state.predictiveMode.hvacPower[state.rooms[0].id], 0);
    updateForecastPanel(state.forecast.threats);
    updateAnomalyPanel(state.activeAlerts);
    updateSensorPanel(state.sensorReadings, state.fusedEstimate);
    updateSavingsPanel(modules.economics.getSavings());

    state.frameCount++;
}