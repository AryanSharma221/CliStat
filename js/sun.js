// js/sun.js

// Calculates the sun's elevation and azimuth based on hour and season
function getSunAngle(hourOfDay, dayOfYear, latitude) {
    const declination = 23.45 * Math.sin((2 * Math.PI / 365) * (284 + dayOfYear));
    const hourAngle = (hourOfDay - 12) * 15; // 15° per hour
    
    const elevation = Math.asin(
        Math.sin(latitude * Math.PI/180) * Math.sin(declination * Math.PI/180) +
        Math.cos(latitude * Math.PI/180) * Math.cos(declination * Math.PI/180) * Math.cos(hourAngle * Math.PI/180)
    );
    
    const azimuth = Math.atan2(
        Math.sin(hourAngle * Math.PI/180),
        Math.cos(hourAngle * Math.PI/180) * Math.sin(latitude * Math.PI/180) - Math.tan(declination * Math.PI/180) * Math.cos(latitude * Math.PI/180)
    );
    
    return { elevation: elevation * 180/Math.PI, azimuth: azimuth * 180/Math.PI };
}

function getSunIntensity(hourOfDay, cloudCoverPercent) {
    if (hourOfDay < 6 || hourOfDay > 18) return 0; // Nighttime
    const baseSolar = Math.sin(((hourOfDay - 6) / 12) * Math.PI);
    const cloudFactor = 1 - (cloudCoverPercent / 100) * 0.85;
    return Math.max(0, baseSolar * cloudFactor);
}

// Generates an array of light rays entering through windows
function generateSunRays(sunAngles, windows, numRaysPerWindow = 15) {
    const allRays = [];
    
    for (const win of windows) {
        if (win.blindState === 'closed') continue;
        const blindAttenuation = win.blindState === 'half' ? 0.4 : 1.0;
        
        for (let i = 0; i < numRaysPerWindow; i++) {
            let originX = win.x;
            let originY = win.y;
            
            // Distribute rays along the window width/height based on orientation
            if (win.facing === 'north' || win.facing === 'south') {
                originX += (i / numRaysPerWindow) * win.width;
            } else {
                originY += (i / numRaysPerWindow) * (win.width || win.height || 100);
            }
            
            const angleRad = (sunAngles.azimuth * Math.PI) / 180;
            
            allRays.push({
                x1: originX, 
                y1: originY,
                x2: originX + Math.cos(angleRad) * 800,
                y2: originY + Math.sin(angleRad) * 800,
                intensity: blindAttenuation,
                roomId: win.roomId || 'unknown'
            });
        }
    }
    return allRays;
}
