function calculateQPredicted(intersections, sunIntensity, occupancyModel, weather, rooms, dt) {
    let solarLoad = 0;
    for (const item of intersections) {
        if (item.isIntersecting) {
            solarLoad += sunIntensity * item.intersectArea * item.thermalMass;
        }
    }

    const expectedOccupants = occupancyModel ? occupancyModel.getExpectedOccupancy(12) : 2;
    const occupancyLoad = expectedOccupants * CONFIG.ASHRAE_METABOLIC_HEAT;

    const avgIndoorTemp = rooms.reduce((sum, r) => sum + r.tempF, 0) / rooms.length;
    const deltaT = Math.max(0, weather.outdoorTempF - avgIndoorTemp);
    const envelopeLoad = CONFIG.U_ENVELOPE * 45 * deltaT; 

    const deltaHumidity = Math.max(0, weather.humidity - 50); 
    const latentLoad = CONFIG.LATENT_HEAT_COEFF * deltaHumidity * 45;

    let decayLoad = 0;
    for (const room of rooms) {
        for (const obj of room.objects) {
            obj.storedHeat *= Math.exp(-CONFIG.THERMAL_DECAY_RATE * dt);
            if (intersections.find(i => i.objectId === obj.id && i.isIntersecting)) {
                obj.storedHeat += sunIntensity * obj.thermalMass * dt;
            }
            decayLoad += obj.storedHeat * 0.1;
        }
    }

    return {
        total:     solarLoad + occupancyLoad + envelopeLoad + latentLoad + decayLoad,
        solar:     solarLoad,
        occupancy: occupancyLoad,
        envelope:  envelopeLoad,
        latent:    latentLoad,
        decay:     decayLoad
    };
}\n