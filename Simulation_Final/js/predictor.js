// js/predictor.js
// =============================================================================
// MEMBER 1 — Physics & Environment Architect (Data Layer)
// -----------------------------------------------------------------------------
// Computes Q_predicted: the unified predicted heat load across five vectors
// (architecture §3 Module 5). This is pure math over the current
// intersections/weather/rooms — it decides nothing about HVAC response.
// -----------------------------------------------------------------------------
// occupancyModel is a parameter, not a hard dependency: pass the real
// stochastic model once occupancy.js exists. Until then,
// defaultOccupancyModel below (a simple day/night curve) keeps this file
// runnable on its own.
// =============================================================================

if (typeof require === 'function' && typeof module !== 'undefined') {
}

/** Placeholder occupancy model — swap for the real stochastic one when ready. */
const defaultOccupancyModel = {
    getExpectedOccupancy(hourOfDay) {
        // Rough day/night curve: ~0 overnight, peaks around evening (7pm).
        if (hourOfDay < 6 || hourOfDay > 23) return 0.2;
        return 0.5 + 1.5 * Math.max(0, Math.sin(((hourOfDay - 6) / 17) * Math.PI));
    }
};

/**
 * Computes Q_predicted for ONE room. Call once per room per tick; the
 * physics engine wants `qPredictedPerRoom = { roomId: total }`.
 */
function calculateQPredicted(intersections, sunIntensity, occupancyModel, weather, room, allRooms, dt) {
    const physics = CONFIG.PHYSICS;
    occupancyModel = occupancyModel || defaultOccupancyModel;

    // Vector 1: Solar Load — sum over this room's intersecting objects
    let solarLoad = 0;
    for (const item of intersections) {
        if (item.roomId === room.id && item.isIntersecting) {
            solarLoad += sunIntensity * item.intersectArea * item.thermalMass;
        }
    }

    // Vector 2: Stochastic Occupancy Load
    const expectedOccupants = occupancyModel.getExpectedOccupancy(weather.hourOfDay ?? 12);
    const occupancyLoad = expectedOccupants * physics.ASHRAE_METABOLIC_HEAT;

    // Vector 3: Envelope Load (heat leaking in from outside through walls/windows)
    const avgIndoorTemp = allRooms.reduce((sum, r) => sum + r.tempF, 0) / allRooms.length;
    const deltaT = Math.max(0, weather.outdoorTempF - avgIndoorTemp);
    const envelopeLoad = physics.U_ENVELOPE * physics.A_ENVELOPE * deltaT;

    // Vector 4: Latent Humidity Load
    const deltaHumidity = Math.max(0, weather.humidity - 50); // above 50% baseline
    const latentLoad = physics.LATENT_HEAT_COEFF * deltaHumidity * physics.A_ENVELOPE;

    // Vector 5: Thermal Decay — stored heat radiating back out of previously
    // irradiated objects in this room (mutates obj.storedHeat, same as spec).
    let decayLoad = 0;
    for (const obj of room.objects) {
        obj.storedHeat = (obj.storedHeat || 0) * Math.exp(-physics.THERMAL_DECAY_RATE * dt);
        const hit = intersections.find(i => i.objectId === obj.id && i.isIntersecting);
        if (hit) {
            obj.storedHeat += sunIntensity * obj.thermalMass * dt;
        }
        decayLoad += obj.storedHeat * 0.1; // radiation fraction
    }

    return {
        total: solarLoad + occupancyLoad + envelopeLoad + latentLoad + decayLoad,
        solar: solarLoad,
        occupancy: occupancyLoad,
        envelope: envelopeLoad,
        latent: latentLoad,
        decay: decayLoad
    };
}

/** Convenience wrapper: computes Q_predicted for every room at once. */
function calculateQPredictedAllRooms(intersections, sunIntensity, occupancyModel, weather, rooms, dt) {
    const perRoom = {};
    const totals = { total: 0, solar: 0, occupancy: 0, envelope: 0, latent: 0, decay: 0 };
    for (const room of rooms) {
        const q = calculateQPredicted(intersections, sunIntensity, occupancyModel, weather, room, rooms, dt);
        perRoom[room.id] = q;
        for (const key of Object.keys(totals)) totals[key] += q[key];
    }
    return { perRoom, totals };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calculateQPredicted, calculateQPredictedAllRooms, defaultOccupancyModel };
}
