// js/physics.js

function updateMultiRoomTemperatures(rooms, connections, hvacPowerPerRoom, dt) {
    const newTemps = {};

    for (const room of rooms) {
        // Calculate Q directly from room objects since predictor handles the breakdown
        let heatGainFromObjects = 0;
        for (const obj of room.objects) {
            heatGainFromObjects += (obj.storedHeat || 0) * 0.1; // Passive radiation
        }

        const heatGain = heatGainFromObjects * dt;
        const hvac = hvacPowerPerRoom[room.id] || 0;
        const heatRemoval = (CONFIG.HVAC_COOLING_POWER * (hvac / 100) / 60) * dt;

        // Inter-room heat diffusion
        let diffusion = 0;
        for (const conn of connections) {
            if (conn.roomA === room.id || conn.roomB === room.id) {
                const otherRoomId = conn.roomA === room.id ? conn.roomB : conn.roomA;
                const otherRoom = rooms.find(r => r.id === otherRoomId);
                const conductance = conn.type === 'door' ? CONFIG.DOOR_CONDUCTANCE : CONFIG.WALL_CONDUCTANCE;
                diffusion += conductance * (otherRoom.tempF - room.tempF) * dt / 3600;
            }
        }

        // Apply envelope thermal leakage
        const outdoorDiff = 75 - room.tempF; // Default to 75 if weather not loaded
        const envelopeLoss = CONFIG.U_ENVELOPE * 45 * outdoorDiff * dt / 3600;

        newTemps[room.id] = room.tempF + (heatGain / CONFIG.ROOM_THERMAL_CAPACITANCE) - heatRemoval + diffusion + envelopeLoss;
    }

    // Apply new temperatures
    for (const room of rooms) {
        room.tempF = newTemps[room.id];
    }
}
