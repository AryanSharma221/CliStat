function calculateDt(currentTime, lastTime) {
    const timeSpeed = parseInt(document.getElementById('time-speed')?.value || 30, 10);
    return ((currentTime - lastTime) / 1000) * timeSpeed;
}

function formatTime(hourDecimal) {
    const h = Math.floor(hourDecimal);
    const m = Math.floor((hourDecimal - h) * 60);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
}

function getAllWindows(rooms) {
    let windows = [];
    rooms.forEach(r => { windows = windows.concat(r.windows || []); });
    return windows;
}

function getAllObjects(rooms) {
    let objects = [];
    rooms.forEach(r => { objects = objects.concat(r.objects || []); });
    return objects;
}

function applyBlindCommands(rooms, commands) {
    rooms.forEach(room => {
        (room.windows || []).forEach(win => {
            const cmd = commands.find(c => c.windowId === win.id);
            if (cmd) {
                win.blindState = cmd.action;
            }
        });
    });
}

function logDataPoint(state) {
    if (state.frameCount % 30 !== 0) return;
    
    state.history.timestamps.push(formatTime(state.simulatedHour));
    state.history.predictiveTempF.push(state.rooms[0].tempF);
    state.history.standardTempF.push(state.standardMode.roomTemps[state.rooms[0].id] || state.rooms[0].tempF);
    state.history.targetTempF.push(state.rooms[0].targetTempF);
    
    const totalPower = state.rooms.reduce((sum, r) => sum + (state.predictiveMode.hvacPower[r.id] || 0), 0);
    const stdPower = state.rooms.reduce((sum, r) => sum + (state.standardMode.hvacPower[r.id] || 0), 0);
    state.history.predictivePower.push(totalPower);
    state.history.standardPower.push(stdPower);

    state.history.qSolar.push(state.qPredicted.solar);
    state.history.qOccupancy.push(state.qPredicted.occupancy);
    state.history.qEnvelope.push(state.qPredicted.envelope);
    state.history.qHumidity.push(state.qPredicted.latent);
    state.history.qDecay.push(state.qPredicted.decay);

    if (state.history.timestamps.length > 500) {
        Object.keys(state.history).forEach(k => {
            state.history[k].shift();
        });
    }
}

function resetSimulation() {
    console.log("Resetting simulation state...");
    simState.simulatedHour = 8;
    simState.rooms = JSON.parse(JSON.stringify(CONFIG.ROOMS));
    
    simState.history = {
        timestamps: [], predictiveTempF: [], standardTempF: [], targetTempF: [],
        predictivePower: [], standardPower: [],
        qSolar: [], qOccupancy: [], qEnvelope: [], qHumidity: [], qDecay: []
    };
    
    if(modules.controller) modules.controller.reset();
}

function updateForecastPanel(threats) {
    const list = document.getElementById('threat-list');
    if(!list) return;
    list.innerHTML = '';
    if (!threats || threats.length === 0) {
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
    if(!list) return;
    list.innerHTML = '';
    if (!alerts || alerts.length === 0) {
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
    const fEst = document.getElementById('fused-estimate');
    if(!list || !fEst) return;
    list.innerHTML = readings.map((r, i) => `S${i+1}: ${r.rawReading.toFixed(1)}°F`).join(' | ');
    fEst.textContent = `Fused Estimate: ${fused.estimate.toFixed(2)}°F (±${fused.uncertainty.toFixed(2)})`;
}

function updateSavingsPanel(savingsData) {
    const sDisp = document.getElementById('savings-display');
    const cDisp = document.getElementById('carbon-display');
    if(sDisp) sDisp.textContent = `$${savingsData.costSaved} saved`;
    if(cDisp) cDisp.textContent = `${savingsData.carbonSavedKg} kg CO₂ avoided`;
}

function calculateRoomQ(qPredicted, roomId) {
    return qPredicted.total / 3;
}\n