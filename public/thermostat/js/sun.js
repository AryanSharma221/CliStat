function getSunIntensity(hourOfDay, cloudCoverPercent) {
    if (hourOfDay < 6 || hourOfDay > 18) return 0;
    const baseSolar = Math.sin(((hourOfDay - 6) / 12) * Math.PI);
    const cloudFactor = 1 - (cloudCoverPercent / 100) * 0.85;
    return baseSolar * cloudFactor;
}

function getSunAngle(hourOfDay, dayOfYear, latitude) {
    const declination = 23.45 * Math.sin((2 * Math.PI / 365) * (284 + dayOfYear));
    const hourAngle = (hourOfDay - 12) * 15; 
    const elevation = Math.asin(
        Math.sin(latitude * Math.PI/180) * Math.sin(declination * Math.PI/180) +
        Math.cos(latitude * Math.PI/180) * Math.cos(declination * Math.PI/180) *
        Math.cos(hourAngle * Math.PI/180)
    );
    const azimuth = Math.atan2(
        Math.sin(hourAngle * Math.PI/180),
        Math.cos(hourAngle * Math.PI/180) * Math.sin(latitude * Math.PI/180) -
        Math.tan(declination * Math.PI/180) * Math.cos(latitude * Math.PI/180)
    );
    return { elevation: elevation * 180/Math.PI, azimuth: azimuth * 180/Math.PI };
}

function generateSunRays(sunAngles, windows, numRaysPerWindow = 20) {
    const allRays = [];
    const currentHour = 12; // simplified
    const cloudCover = 10;
    for (const win of windows) {
        if (win.blindState === 'closed') continue;
        const blindAttenuation = win.blindState === 'half' ? 0.4 : 1.0;
        for (let i = 0; i < numRaysPerWindow; i++) {
            const originX = win.x + (i / numRaysPerWindow) * win.width;
            const originY = win.y;
            const angleRad = (sunAngles.azimuth * Math.PI) / 180;
            allRays.push({
                x1: originX, y1: originY,
                x2: originX + Math.cos(angleRad) * 800,
                y2: originY + Math.sin(angleRad) * 800,
                intensity: getSunIntensity(currentHour, cloudCover) * blindAttenuation,
                roomId: win.roomId
            });
        }
    }
    return allRays;
}

function forecastThreats(currentHour, objects, windows, forecastHours = 2) {
    const threats = [];
    const dayOfYear = 172;
    const latitude = 37.77;
    for (let h = currentHour; h < Math.min(currentHour + forecastHours, 18); h += 0.1) {
        const futureAngles = getSunAngle(h, dayOfYear, latitude);
        const futureRays = generateSunRays(futureAngles, windows);
        const futureHits = detectAllIntersections(futureRays, objects);
        for (const hit of futureHits) {
            if (hit.isIntersecting && hit.thermalMass > 0.4) {
                const minutesUntil = (h - currentHour) * 60;
                if (!threats.find(t => t.objectId === hit.objectId)) {
                    const obj = objects.find(o => o.id === hit.objectId);
                    threats.push({
                        objectId: hit.objectId,
                        objectLabel: obj ? obj.label : 'Unknown',
                        minutesUntil: Math.round(minutesUntil),
                        estimatedHeatSpike: hit.intersectArea * hit.thermalMass,
                        roomId: hit.roomId
                    });
                }
            }
        }
    }
    return threats.sort((a, b) => a.minutesUntil - b.minutesUntil);
}\n