// js/physics.js
// =============================================================================
// MEMBER 1 — Physics & Environment Architect (Data Layer)
// -----------------------------------------------------------------------------
// Multi-room temperature update: heat gain from Q_predicted, heat removed by
// HVAC (the *effect* of a control decision, not the decision itself — the
// controller module decides `hvacPowerPerRoom`, this file just applies the
// resulting physics), and inter-room diffusion through walls/doors.
// =============================================================================

if (typeof require === 'function' && typeof module !== 'undefined') {
}

/**
 * Advances every room's temperature by one timestep `dt` (seconds).
 * Mutates `rooms` in place (sets room.tempC) and also returns the map of
 * new temperatures, in case a caller wants them before committing.
 */
function updateMultiRoomTemperatures(rooms, connections, qPredictedPerRoom, hvacPowerPerRoom, dt) {
    const physics = CONFIG.PHYSICS;
    const newTemps = {};

    for (const room of rooms) {
        const q = qPredictedPerRoom[room.id] || 0;
        const hvac = hvacPowerPerRoom[room.id] || 0;

        // Heat gain from Q_predicted (solar + occupancy + envelope + latent + decay)
        const heatGain = (q / physics.ROOM_THERMAL_CAPACITANCE) * dt;

        // Heat removed by HVAC running at `hvac`% power
        const heatRemoval = (physics.HVAC_COOLING_POWER * (hvac / 100) / 60) * dt;

        // Inter-room heat diffusion through shared walls/doors
        let diffusion = 0;
        for (const conn of connections) {
            if (conn.roomA !== room.id && conn.roomB !== room.id) continue;
            const otherId = conn.roomA === room.id ? conn.roomB : conn.roomA;
            const otherRoom = rooms.find(r => r.id === otherId);
            if (!otherRoom) continue;
            const conductance = conn.type === 'door' ? physics.DOOR_CONDUCTANCE : physics.WALL_CONDUCTANCE;
            diffusion += conductance * (otherRoom.tempC - room.tempC) * dt / 3600;
        }

        let next = room.tempC + heatGain - heatRemoval + diffusion;

        // Safety guard (verification checklist: no NaN/Infinity, stay in range)
        if (!Number.isFinite(next)) next = room.tempC;
        next = Math.min(physics.MAX_TEMP_C, Math.max(physics.MIN_TEMP_C, next));

        newTemps[room.id] = next;
    }

    for (const room of rooms) {
        room.tempC = newTemps[room.id];
    }
    return newTemps;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { updateMultiRoomTemperatures };
}
