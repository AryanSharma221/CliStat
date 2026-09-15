// js/vec3.js
// =============================================================================
// MEMBER 1 — Physics & Environment Architect (Data Layer)
// -----------------------------------------------------------------------------
// Minimal, dependency-free 3D vector / ray / box math.
//
// Why no Three.js here: the data layer must not assume how (or whether) the
// UI teammate renders the scene — Canvas 2D, a Three.js WebGL scene, or
// nothing at all (e.g. a Node test). Pulling in Three.js just for Vector3 /
// Raycaster math would also reintroduce the exact risk flagged in the team's
// own risk table ("Three.js raycasting too slow/complex — fallback to 2D").
// This file sidesteps that risk entirely: it's ~80 lines of plain math, it
// runs anywhere JS runs, and it produces real 3D ray/box intersections.
//
// Coordinate convention (world units, consistent with the existing 2D
// floorplan so nothing already shipped breaks):
//   X — east/west   (same as the existing top-down `x`)
//   Z — north/south (same as the existing top-down `y`)
//   Y — vertical height off the floor (new axis)
// =============================================================================

class Vec3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x; this.y = y; this.z = z;
    }
    add(v)   { return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z); }
    sub(v)   { return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z); }
    scale(s) { return new Vec3(this.x * s, this.y * s, this.z * s); }
    dot(v)   { return this.x * v.x + this.y * v.y + this.z * v.z; }
    length() { return Math.sqrt(this.dot(this)); }
    normalize() {
        const len = this.length();
        return len > 1e-9 ? this.scale(1 / len) : new Vec3(0, 0, 0);
    }
}

/**
 * Axis-aligned bounding box in 3D world space.
 */
class Box3 {
    constructor(min, max) { this.min = min; this.max = max; }

    /** Does this box overlap another box on all three axes? */
    intersectsBox(other) {
        return (
            this.min.x <= other.max.x && this.max.x >= other.min.x &&
            this.min.y <= other.max.y && this.max.y >= other.min.y &&
            this.min.z <= other.max.z && this.max.z >= other.min.z
        );
    }
}

/**
 * A 3D ray: an origin point plus a (should be unit-length) direction.
 */
class Ray3 {
    constructor(origin, direction) {
        this.origin = origin;
        this.direction = direction;
    }

    /**
     * Slab-method ray/AABB intersection test.
     * Returns { hit: boolean, tMin: number, tMax: number }. tMin/tMax are the
     * ray-parameter distances where it enters/exits the box (only meaningful
     * when hit === true, and only for tMin/tMax >= 0, i.e. in front of the
     * ray origin).
     */
    intersectBox(box) {
        let tMin = -Infinity;
        let tMax = Infinity;

        for (const axis of ['x', 'y', 'z']) {
            const d = this.direction[axis];
            const o = this.origin[axis];
            const lo = box.min[axis];
            const hi = box.max[axis];

            if (Math.abs(d) < 1e-9) {
                // Ray is parallel to this axis's slab — must already be inside it.
                if (o < lo || o > hi) return { hit: false, tMin: 0, tMax: 0 };
                continue;
            }
            let t1 = (lo - o) / d;
            let t2 = (hi - o) / d;
            if (t1 > t2) [t1, t2] = [t2, t1];
            tMin = Math.max(tMin, t1);
            tMax = Math.min(tMax, t2);
            if (tMin > tMax) return { hit: false, tMin: 0, tMax: 0 };
        }

        // Box is behind the ray's origin entirely.
        if (tMax < 0) return { hit: false, tMin: 0, tMax: 0 };
        return { hit: true, tMin, tMax };
    }
}

/**
 * Builds a unit direction vector for the ray light travels along, given the
 * sun's elevation and azimuth (degrees, as returned by getSunAngle in sun.js).
 * Azimuth convention: 0° = North, 90° = East (compass bearing, matches the
 * hour-angle formula already used for getSunAngle).
 */
function sunDirectionFromAngles(elevationDeg, azimuthDeg) {
    const elev = (elevationDeg * Math.PI) / 180;
    const az = (azimuthDeg * Math.PI) / 180;

    // Unit vector FROM the room TOWARD the sun.
    const towardSun = new Vec3(
        Math.cos(elev) * Math.sin(az),   // X (east component)
        Math.sin(elev),                  // Y (up component)
        Math.cos(elev) * Math.cos(az)    // Z (north component)
    );

    // Light travels the opposite way (from the sun, down into the room).
    return towardSun.scale(-1).normalize();
}

// Node-compatible export guard. In the browser (loaded via <script>), these
// classes/functions simply live on the global scope, exactly like the rest
// of this codebase's vanilla-JS modules — `module` is undefined there, so
// this block is skipped and nothing changes.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Vec3, Box3, Ray3, sunDirectionFromAngles };
}
