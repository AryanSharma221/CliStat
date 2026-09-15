function updateMultiRoomTemperatures(rooms, connections, hvacPowerPerRoom, dt) {
    const ROOM_THERMAL_CAPACITANCE = 500;
    const HVAC_COOLING_POWER       = 5.0;

    const newTemps = {};
    for (const room of rooms) {
        const hvac = hvacPowerPerRoom[room.id] || 0;
        const heatGain = (0.5 * dt) / ROOM_THERMAL_CAPACITANCE; 
        const heatRemoval = (HVAC_COOLING_POWER * (hvac / 100) / 60) * dt;

        let diffusion = 0;
        for (const conn of connections) {
            if (conn.from === room.id || conn.to === room.id) {
                const otherRoomId = conn.from === room.id ? conn.to : conn.from;
                const otherRoom = rooms.find(r => r.id === otherRoomId);
                const conductance = conn.type === 'door' ? 0.6 : 0.15;
                diffusion += conductance * (otherRoom.tempF - room.tempF) * dt / 3600;
            }
        }
        newTemps[room.id] = room.tempF + heatGain - heatRemoval + diffusion;
    }
    for (const room of rooms) {
        room.tempF = newTemps[room.id];
    }
}\n