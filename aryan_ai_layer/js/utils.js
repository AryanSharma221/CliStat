// js/utils.js

// Calculate delta time between frames
function calculateDt(currentTime, lastTime) {
    const timeSpeed = parseInt(document.getElementById('time-speed').value, 10) || 30;
    // Return simulated seconds passed
    return ((currentTime - lastTime) / 1000) * timeSpeed;
}

// Format simulated hour (e.g., 14.5 -> "2:30 PM")
function formatTime(hourDecimal) {
    const h = Math.floor(hourDecimal);
    const m = Math.floor((hourDecimal - h) * 60);
    const period = h >= 12 && h < 24 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
}

// Flatten all windows across all rooms for raycasting
function getAllWindows(rooms) {
    let windows = [];
    rooms.forEach(r => { windows = windows.concat(r.windows); });
    return windows;
}

// Flatten all objects across all rooms for raycasting
function getAllObjects(rooms) {
    let objects = [];
    rooms.forEach(r => { objects = objects.concat(r.objects); });
    return objects;
}

// Helper to log state for charts
function logDataPoint(state) {
    if (state.frameCount % 30 !== 0) return;
    
    state.history.timestamps.push(formatTime(state.simulatedHour));
    state.history.temps.push(state.rooms[0].tempF);
    
    const totalPower = state.rooms.reduce((sum, r) => sum + (state.predictiveMode.hvacPower[r.id] || 0), 0);
    state.history.power.push(totalPower);

    if (state.history.timestamps.length > 500) {
        state.history.timestamps.shift();
        state.history.temps.shift();
        state.history.power.shift();
    }
}
