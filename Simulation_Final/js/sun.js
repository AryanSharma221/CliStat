// js/sun.js
// =============================================================================
// MEMBER 1 — Physics & Environment Architect (Data Layer)
// -----------------------------------------------------------------------------
// Solar position (real declination/elevation/azimuth astronomy, architecture
// §3 Module 2), cloud-attenuated intensity, and genuine 3D ray generation
// through each window. Pure math — no DOM, no Three.js, no rendering.
// =============================================================================

if (typeof require === 'function' && typeof module !== 'undefined') {
}

/**
 * Solar intensity (0..1) for a given hour of day and cloud cover.
 * Zero before 6am / after 6pm. Sine curve peaking at solar noon, attenuated
 * up to 85% by full cloud cover.
 */
function getSunIntensity(hourOfDay, cloudCoverPercent) {
    if (hourOfDay < 6 || hourOfDay > 18) return 0;
    const baseSolar = Math.sin(((hourOfDay - 6) / 12) * Math.PI);
    const cloudFactor = 1 - (cloudCoverPercent / 100) * 0.85;
    return baseSolar * cloudFactor;
}

/**
 * Sun elevation + azimuth (degrees) for a given hour/day-of-year/latitude,
 * via the standard solar declination + hour-angle formulas.
 * Azimuth convention: 0deg = North, 90deg = East (compass bearing).
 */
function getSunAngle(hourOfDay, dayOfYear, latitude) {
    const declination = 23.45 * Math.sin((2 * Math.PI / 365) * (284 + dayOfYear));
    const hourAngle = (hourOfDay - 12) * 15; // 15 degrees per hour

    const latRad = latitude * Math.PI / 180;
    const decRad = declination * Math.PI / 180;
    const haRad = hourAngle * Math.PI / 180;

    const elevation = Math.asin(
        Math.sin(latRad) * Math.sin(decRad) +
        Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad)
    );
    const azimuth = Math.atan2(
        Math.sin(haRad),
        Math.cos(haRad) * Math.sin(latRad) - Math.tan(decRad) * Math.cos(latRad)
    );

    return {
        elevation: elevation * 180 / Math.PI,
        // atan2 above is measured from due south in the standard formula;
        // convert to a 0-360, 0=North compass bearing for our world axes.
        azimuth: (azimuth * 180 / Math.PI + 180 + 360) % 360
    };
}

const WINDOW_NORMALS = {
    N: new Vec3(0, 0, 1),
    S: new Vec3(0, 0, -1),
    E: new Vec3(1, 0, 0),
    W: new Vec3(-1, 0, 0)
};

/** Flattens rooms[].windows into a single array, tagging each with roomId. */
function flattenWindows(rooms) {
    const out = [];
    for (const room of rooms) {
        for (const win of room.windows) {
            out.push(Object.assign({ roomId: room.id }, win));
        }
    }
    return out;
}

/**
 * Generates real 3D sun rays through every open window, sampled on a
 * gridW x gridH grid across each window's width AND height (the 2D spec
 * only sampled along width — this is the genuine 3D upgrade). Skips windows
 * that are closed, or that the sun isn't actually facing (a north window
 * doesn't receive direct light from a southern sun — the flat 2D version
 * didn't check this).
 *
 * Each ray carries an `areaQuantum`: the slice of the window's real opening
 * area it represents, pre-attenuated for blind state. collision.js sums the
 * areaQuantum of every ray that hits a given object to get that object's
 * irradiated area — physically it's a Monte-Carlo estimate of exposed area.
 */
function generateSunRays3D(sunAngles, rooms, options = {}) {
    const physics = CONFIG.PHYSICS;
    const gridW = options.gridW || physics.RAY_GRID_WIDTH;
    const gridH = options.gridH || physics.RAY_GRID_HEIGHT;

    const rays = [];
    if (sunAngles.elevation <= 0) return rays; // sun below the horizon

    const direction = sunDirectionFromAngles(sunAngles.elevation, sunAngles.azimuth);
    const towardSun = direction.scale(-1);

    for (const win of flattenWindows(rooms)) {
        if (win.blindState === 'closed') continue;
        const blindAttenuation = win.blindState === 'half' ? 0.4 : 1.0;

        const normal = WINDOW_NORMALS[win.orientation];
        if (!normal || normal.dot(towardSun) <= 0) continue; // sun isn't on this face

        const sillHeight = win.sillHeight ?? physics.DEFAULT_SILL_HEIGHT;
        const winHeight = win.winHeight ?? physics.DEFAULT_WINDOW_HEIGHT;
        const alongIsX = win.orientation === 'N' || win.orientation === 'S';
        const wallExtent = alongIsX ? win.width : win.height;
        const areaQuantum = (wallExtent * winHeight * blindAttenuation) / (gridW * gridH);

        for (let iw = 0; iw < gridW; iw++) {
            const along = ((iw + 0.5) / gridW) * wallExtent;
            for (let ih = 0; ih < gridH; ih++) {
                const vertical = sillHeight + ((ih + 0.5) / gridH) * winHeight;
                const origin = alongIsX
                    ? new Vec3(win.x + along, vertical, win.y)
                    : new Vec3(win.x, vertical, win.y + along);

                rays.push({
                    origin, direction,
                    areaQuantum,
                    roomId: win.roomId,
                    windowId: win.id
                });
            }
        }
    }
    return rays;
}

/**
 * Looks ahead `forecastHours` in 0.1h steps, re-running sun position + 3D
 * collision at each step, and reports which high-thermal-mass objects will
 * be struck and when — powers the "Sun hits Dark Sofa in 25 minutes" panel.
 * Takes detectAllIntersections3D as a parameter so this file has no hard
 * dependency on collision.js's load order.
 */
function forecastThreats3D(currentHour, dayOfYear, latitude, rooms, detectAllIntersections3D, forecastHours = 2) {
    const threats = [];
    const objects = rooms.flatMap(r => r.objects.map(o => Object.assign({ roomId: r.id }, o)));

    for (let h = currentHour; h < Math.min(currentHour + forecastHours, 18); h += 0.1) {
        const futureAngles = getSunAngle(h, dayOfYear, latitude);
        const futureRays = generateSunRays3D(futureAngles, rooms);
        const futureHits = detectAllIntersections3D(futureRays, objects);

        for (const hit of futureHits) {
            if (hit.isIntersecting && hit.thermalMass > 0.4 && !threats.find(t => t.objectId === hit.objectId)) {
                const obj = objects.find(o => o.id === hit.objectId);
                threats.push({
                    objectId: hit.objectId,
                    objectLabel: obj.label,
                    minutesUntil: Math.round((h - currentHour) * 60),
                    estimatedHeatSpike: hit.intersectArea * hit.thermalMass,
                    roomId: hit.roomId
                });
            }
        }
    }
    return threats.sort((a, b) => a.minutesUntil - b.minutesUntil);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getSunIntensity, getSunAngle, flattenWindows,
        generateSunRays3D, forecastThreats3D, WINDOW_NORMALS
    };
}
