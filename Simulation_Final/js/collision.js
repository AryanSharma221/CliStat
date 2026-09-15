// js/collision.js
// =============================================================================
// MEMBER 1 — Physics & Environment Architect (Data Layer)
// -----------------------------------------------------------------------------
// The "virtual camera": tests every sun ray against every furniture object's
// 3D bounding box to determine what's being irradiated, and by how much.
// This is genuine 3D raycasting (slab-method ray/AABB intersection via
// vec3.js), not a 2D top-down approximation.
// =============================================================================

if (typeof require === 'function' && typeof module !== 'undefined') {
}

/** Builds a 3D bounding box for a furniture object from its config fields. */
function boxFromObject(obj) {
    const physics = CONFIG.PHYSICS;
    const z = obj.z ?? 0;
    const objHeight = obj.objHeight ?? physics.DEFAULT_OBJECT_HEIGHT;
    return new Box3(
        new Vec3(obj.x, z, obj.y),
        new Vec3(obj.x + obj.width, z + objHeight, obj.y + obj.height)
    );
}

/**
 * Tests every ray against every object's 3D box. Returns one result per
 * object: { objectId, isIntersecting, intersectArea, hitRayCount,
 * thermalMass, roomId }. `intersectArea` is a pure geometric quantity (sun
 * intensity is intentionally NOT folded in here — predictor.js multiplies
 * sunIntensity in separately, matching the architecture's Q_predicted
 * contract). Rays only test against objects in their own room.
 */
function detectAllIntersections3D(rays, objects) {
    const raysByRoom = new Map();
    for (const ray of rays) {
        if (!raysByRoom.has(ray.roomId)) raysByRoom.set(ray.roomId, []);
        raysByRoom.get(ray.roomId).push(ray);
    }

    const results = [];
    for (const obj of objects) {
        const box = boxFromObject(obj);
        const roomRays = raysByRoom.get(obj.roomId) || [];

        let totalArea = 0;
        let hitCount = 0;
        for (const ray of roomRays) {
            const hit = new Ray3(ray.origin, ray.direction).intersectBox(box);
            if (hit.hit && hit.tMax >= 0) {
                totalArea += ray.areaQuantum;
                hitCount++;
            }
        }

        results.push({
            objectId: obj.id,
            isIntersecting: hitCount > 0,
            intersectArea: totalArea,
            hitRayCount: hitCount,
            thermalMass: obj.thermalMass,
            roomId: obj.roomId
        });
    }
    return results;
}

/** Flattens rooms[].objects into a single array, tagging each with roomId. */
function flattenObjects(rooms) {
    const out = [];
    for (const room of rooms) {
        for (const obj of room.objects) {
            out.push(Object.assign({ roomId: room.id }, obj));
        }
    }
    return out;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { detectAllIntersections3D, flattenObjects, boxFromObject };
}
