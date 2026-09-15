// js/main.js

let simState = {};
let modules = {};

window.addEventListener('DOMContentLoaded', async () => {
    console.log("Booting Predictive Digital Twin...");
    
    // 1. Initialize DOM Elements & Context
    const canvas = document.getElementById('sim-canvas');
    const ctx = canvas.getContext('2d');
    
    // 2. Initialize State from active environment preset
    initState();

    // 3. Instantiate Core Intelligence Modules (Safely checking if teammates finished them)
    initModules();

    // 4. Wire Environment Switcher
    document.getElementById('env-select').addEventListener('change', (e) => {
        CONFIG.ACTIVE_ENVIRONMENT = e.target.value;
        initState();
        initModules();
        console.log(`Switched to: ${getActiveEnvironment().name}`);
    });

    // 5. Start Simulation Loop
    let lastTime = performance.now();
    function loop(time) {
        simState.dtSeconds = calculateDt(time, lastTime);
        lastTime = time;
        simulationTick(ctx, simState, modules);
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
});

function initState() {
    const env = getActiveEnvironment();
    simState = {
        simulatedHour: 8,
        dayOfYear: 172,            // Summer solstice
        latitude: 37.7749,         // San Francisco
        frameCount: 0,
        dtSeconds: 0,
        simulationSpeed: 30,
        activeMode: 'pidff',
        environmentName: env.name,
        rooms: getActiveRooms(),
        connections: getActiveConnections(),
        weather: { outdoorTempF: 75, humidity: 45, cloud: 10, description: 'Clear' },
        activeAlerts: [],
        sensorReadings: [],
        fusedEstimate: { estimate: 72, uncertainty: 0 },
        qPredicted: { total: 0, solar: 0, occupancy: 0, envelope: 0, latent: 0, decay: 0 },
        predictiveMode: { hvacPower: {} },
        standardMode: { hvacPower: {} },
        history: { timestamps: [], temps: [], power: [] },
        forecast: { threats: [] },
        blindCommands: [],
        sun: { elevation: 0, azimuth: 0, intensity: 0, rays: [] },
        intersections: []
    };
    // Initialize HVAC power per room
    for (const room of simState.rooms) {
        simState.predictiveMode.hvacPower[room.id] = 0;
        simState.standardMode.hvacPower[room.id] = 0;
    }
}

function initModules() {
    modules = {};
    if (typeof ThermalHeatmap !== 'undefined') modules.heatmap = new ThermalHeatmap(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    if (typeof FeedForwardPIDController !== 'undefined') modules.controller = new FeedForwardPIDController(CONFIG.PID.Kp, CONFIG.PID.Ki, CONFIG.PID.Kd, CONFIG.PID.Kff);
    if (typeof BangBangController !== 'undefined') modules.standardController = new BangBangController();
    if (typeof SmartBlindController !== 'undefined') modules.blindController = new SmartBlindController(getAllWindows(simState.rooms));
    if (typeof EconomicsTracker !== 'undefined') modules.economics = new EconomicsTracker();
    if (typeof StochasticOccupancyModel !== 'undefined') modules.occupancy = new StochasticOccupancyModel();
    if (typeof AnomalyDetector !== 'undefined') modules.anomaly = new AnomalyDetector();
    if (typeof PlaybackEngine !== 'undefined') modules.playback = new PlaybackEngine();
    if (typeof DigitalTwinCalibrator !== 'undefined') modules.calibrator = new DigitalTwinCalibrator();
}

// ═══════════════════════════════════════════════════════
//  THE CORE SIMULATION TICK (runs every animation frame)
// ═══════════════════════════════════════════════════════
function simulationTick(ctx, state, mods) {
    // 1. Advance Simulated Time
    state.simulatedHour += state.dtSeconds / 3600;
    if (state.simulatedHour >= 24) state.simulatedHour -= 24;

    // 2. Sun Engine — Seasonal Path + Cloud Attenuation
    if (typeof getSunAngle !== 'undefined') {
        const sunAngles = getSunAngle(state.simulatedHour, state.dayOfYear, state.latitude);
        state.sun.elevation = sunAngles.elevation;
        state.sun.azimuth = sunAngles.azimuth;
        state.sun.intensity = typeof getSunIntensity !== 'undefined'
            ? getSunIntensity(state.simulatedHour, state.weather.cloud) : 0;
        
        if (typeof generateSunRays !== 'undefined') {
            state.sun.rays = generateSunRays(sunAngles, getAllWindows(state.rooms));
        }
    }

    // 3. Virtual Computer Vision — Collision Detection
    if (typeof detectAllIntersections !== 'undefined' && state.sun.rays.length > 0) {
        state.intersections = detectAllIntersections(state.sun.rays, getAllObjects(state.rooms));
    }

    // 4. Q_predicted Calculator (5 vectors)
    if (typeof calculateQPredicted !== 'undefined') {
        const occModel = mods.occupancy || { getExpectedOccupancy: () => 0 };
        state.qPredicted = calculateQPredicted(
            state.intersections, state.sun.intensity,
            occModel, state.weather, state.rooms, state.dtSeconds
        );
    }

    // 5. Controllers — Predictive (PID/MPC) + Standard (Bang-Bang)
    for (const room of state.rooms) {
        // Predictive mode
        if (mods.controller) {
            state.predictiveMode.hvacPower[room.id] = mods.controller.compute(
                room.tempF, room.targetTempF, state.qPredicted.total, state.dtSeconds
            );
        }
        // Standard mode (runs in parallel for comparison)
        if (mods.standardController) {
            state.standardMode.hvacPower[room.id] = mods.standardController.compute(room.tempF, room.targetTempF);
        }
    }

    // 6. Physics — Update room temperatures
    if (typeof updateMultiRoomTemperatures !== 'undefined') {
        updateMultiRoomTemperatures(state.rooms, state.connections, state.predictiveMode.hvacPower, state.dtSeconds);
    }

    // 7. Log Data for Charts
    logDataPoint(state);
    state.frameCount++;

    // 8. Render Everything
    if (typeof render === 'function') {
        render(ctx, state);
    } else {
        // Fallback: draw basic info until renderer.js is ready
        ctx.fillStyle = CONFIG.COLORS.background;
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        ctx.fillStyle = CONFIG.COLORS.text;
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(`Environment: ${state.environmentName}`, 30, 40);
        ctx.fillText(`Time: ${formatTime(state.simulatedHour)}`, 30, 70);
        ctx.font = '14px sans-serif';
        let y = 110;
        for (const room of state.rooms) {
            ctx.fillStyle = room.tempF > room.targetTempF ? CONFIG.COLORS.hot : CONFIG.COLORS.cold;
            ctx.fillText(`${room.label}: ${room.tempF.toFixed(1)}°F (target: ${room.targetTempF}°F)  |  HVAC: ${(state.predictiveMode.hvacPower[room.id] || 0).toFixed(0)}%`, 30, y);
            y += 25;
        }
        ctx.fillStyle = '#666';
        ctx.fillText('Waiting for renderer.js from Member A...', 30, y + 30);
    }
}
