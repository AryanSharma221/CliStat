// js/renderer3d.js
// =============================================================================
// 3D ENVIRONMENT ENGINE (Three.js WebGL) — Rendering Layer
// -----------------------------------------------------------------------------
// Builds and updates the visual 3D scene from the data layer's output
// (config.js ROOMS + the state.sun / state.rooms shape produced by
// sun.js/physics.js/predictor.js). Reads that data, never mutates it.
//
// Coordinate mapping (matches vec3.js exactly, no axis swap needed):
//   world X (east/west) -> THREE X | world Z (north/south) -> THREE Z
//   world Y (height)    -> THREE Y (up)
//
// Walls are rendered as thin, semi-transparent panels (not solid with
// boolean-cut window holes) so the dollhouse interior stays visible from
// outside — window quads are layered on top, tinted/opacity by blindState.
// This sidesteps CSG entirely, in the same spirit as vec3.js sidestepping
// full Three.js raycasting: simplest thing that looks right and stays fast.
//
// Public API:
//   createEnvironment3D(canvas, rooms) -> env
//   updateEnvironment3D(env, state)      // call once per simulationTick
//   renderEnvironment3D(env)             // call once per rAF, after update
//   disposeEnvironment3D(env)
//
// index.html: load Three.js r128 BEFORE this file:
//   <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
// Load after config.js. vec3.js's sunDirectionFromAngles is reused if present,
// with a local fallback so this file has no hard dependency on it.
// =============================================================================

const MAX_RAY_LINES = 140;          // pre-allocated ray-line budget (perf cap)
const RAY_VISUAL_LENGTH = 110;      // world units drawn per sun ray
const STOREDHEAT_VISUAL_CAP = 20;   // storedHeat value that maps to "fully hot"
const FURNITURE_BASE_PALETTE = ['#7c8a99', '#8a7c99', '#99927c', '#7c9987', '#99807c'];

function computeSunDirection(elevation, azimuth) {
    if (typeof sunDirectionFromAngles === 'function') return sunDirectionFromAngles(elevation, azimuth);
    const elev = (elevation * Math.PI) / 180, az = (azimuth * Math.PI) / 180;
    return {
        x: -(Math.cos(elev) * Math.sin(az)),
        y: -(Math.sin(elev)),
        z: -(Math.cos(elev) * Math.cos(az))
    };
}

function lerpColorHex(hexA, hexB, t) {
    return new THREE.Color(hexA).lerp(new THREE.Color(hexB), THREE.MathUtils.clamp(t, 0, 1));
}

function tempColor(tempF) {
    const p = CONFIG.PHYSICS;
    const t = (tempF - p.MIN_TEMP_F) / (p.MAX_TEMP_F - p.MIN_TEMP_F);
    return lerpColorHex(CONFIG.COLORS.cold, CONFIG.COLORS.hot, t);
}

function worldBounds(rooms) {
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    for (const r of rooms) {
        minX = Math.min(minX, r.x); maxX = Math.max(maxX, r.x + r.width);
        minZ = Math.min(minZ, r.y); maxZ = Math.max(maxZ, r.y + r.height);
    }
    return { minX, minZ, maxX, maxZ, cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2, span: Math.max(maxX - minX, maxZ - minZ) };
}

// ---------------------------------------------------------------------------
// Scene construction (call once)
// ---------------------------------------------------------------------------
function createEnvironment3D(canvas, rooms) {
    const bounds = worldBounds(rooms);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(CONFIG.COLORS.background);

    const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight || 1, 1, 5000);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(canvas.clientWidth || 800, canvas.clientHeight || 500, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const ambient = new THREE.AmbientLight(0x8899aa, 0.6);
    scene.add(ambient);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1);
    sunLight.target.position.set(bounds.cx, 0, bounds.cz);
    scene.add(sunLight, sunLight.target);

    const sunMesh = new THREE.Mesh(
        new THREE.SphereGeometry(14, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xffdd66 })
    );
    scene.add(sunMesh);

    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(bounds.span * 3, bounds.span * 3),
        new THREE.MeshBasicMaterial({ color: 0x1a1a1a })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(bounds.cx, -1, bounds.cz);
    scene.add(ground);

    const rayGeometry = new THREE.BufferGeometry();
    rayGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_RAY_LINES * 2 * 3), 3));
    rayGeometry.setDrawRange(0, 0);
    const rayLines = new THREE.LineSegments(
        rayGeometry,
        new THREE.LineBasicMaterial({ color: 0xffeb3b, transparent: true, opacity: 0.45 })
    );
    scene.add(rayLines);

    const env = {
        canvas, scene, camera, renderer, ambient, sunLight, sunMesh, ground, rayLines,
        bounds, roomIndex: {},           // roomId -> { floor }
        objectIndex: {},                 // objectId -> mesh
        windowIndex: {},                 // windowId -> mesh
        controls: { azimuth: 0.9, polar: 1.0, radius: bounds.span * 1.4, target: new THREE.Vector3(bounds.cx, 30, bounds.cz) }
    };

    for (const room of rooms) buildRoom3D(scene, room, env);
    attachCameraControls(env);

    if (typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(() => resizeEnvironment3D(env)).observe(canvas);
    }
    return env;
}

function buildRoom3D(scene, room, env) {
    const p = CONFIG.PHYSICS;
    const roomHeight = room.roomHeight ?? p.DEFAULT_ROOM_HEIGHT;
    const wallMat = new THREE.MeshStandardMaterial({ color: CONFIG.COLORS.roomWall, transparent: true, opacity: 0.18, side: THREE.DoubleSide });
    const wallThickness = 6;

    const walls = [
        { w: room.width, cx: room.x + room.width / 2, cz: room.y, rotY: 0 },                      // N
        { w: room.width, cx: room.x + room.width / 2, cz: room.y + room.height, rotY: 0 },         // S
        { w: room.height, cx: room.x, cz: room.y + room.height / 2, rotY: Math.PI / 2 },           // W
        { w: room.height, cx: room.x + room.width, cz: room.y + room.height / 2, rotY: Math.PI / 2 } // E
    ];
    for (const w of walls) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w.w, roomHeight, wallThickness), wallMat);
        mesh.position.set(w.cx, roomHeight / 2, w.cz);
        mesh.rotation.y = w.rotY;
        scene.add(mesh);
    }

    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(room.width, room.height),
        new THREE.MeshStandardMaterial({ color: tempColor(room.tempF), side: THREE.DoubleSide })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(room.x + room.width / 2, 0, room.y + room.height / 2);
    scene.add(floor);
    env.roomIndex[room.id] = { floor, room };

    for (const win of room.windows) buildWindow3D(scene, win, env);
    for (const obj of room.objects) buildFurniture3D(scene, obj, env);
}

function buildWindow3D(scene, win, env) {
    const p = CONFIG.PHYSICS;
    const sill = win.sillHeight ?? p.DEFAULT_SILL_HEIGHT;
    const winH = win.winHeight ?? p.DEFAULT_WINDOW_HEIGHT;
    const alongIsX = win.orientation === 'N' || win.orientation === 'S';
    const span = alongIsX ? win.width : win.height;

    const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(span, winH),
        new THREE.MeshBasicMaterial({ color: CONFIG.COLORS.window, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    if (alongIsX) {
        mesh.position.set(win.x + span / 2, sill + winH / 2, win.y);
    } else {
        mesh.rotation.y = Math.PI / 2;
        mesh.position.set(win.x, sill + winH / 2, win.y + span / 2);
    }
    scene.add(mesh);
    env.windowIndex[win.id] = mesh;
}

function buildFurniture3D(scene, obj, env) {
    const p = CONFIG.PHYSICS;
    const z = obj.z ?? 0;
    const objHeight = obj.objHeight ?? p.DEFAULT_OBJECT_HEIGHT;
    const base = FURNITURE_BASE_PALETTE[Object.keys(env.objectIndex).length % FURNITURE_BASE_PALETTE.length];

    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(obj.width, objHeight, obj.height),
        new THREE.MeshStandardMaterial({ color: base })
    );
    mesh.position.set(obj.x + obj.width / 2, z + objHeight / 2, obj.y + obj.height / 2);
    mesh.userData.baseColor = base;
    scene.add(mesh);
    env.objectIndex[obj.id] = mesh;
}

// ---------------------------------------------------------------------------
// Per-tick sync (call from the sim loop, after the data layer updates state)
// ---------------------------------------------------------------------------
function updateEnvironment3D(env, state) {
    const sun = state.sun;
    if (sun) {
        const dir = computeSunDirection(sun.elevation, sun.azimuth);
        const R = env.bounds.span * 1.6;
        env.sunLight.position.set(env.bounds.cx - dir.x * R, Math.max(40, -dir.y * R), env.bounds.cz - dir.z * R);
        env.sunMesh.position.copy(env.sunLight.position);
        const intensity = THREE.MathUtils.clamp(sun.intensity ?? 0, 0, 1);
        env.sunLight.intensity = 0.15 + intensity * 1.6;
        env.ambient.intensity = 0.25 + intensity * 0.45;
        env.sunMesh.visible = sun.elevation > 0;
        updateRayLines(env, sun.rays || []);
    }

    for (const room of state.rooms) {
        const entry = env.roomIndex[room.id];
        if (!entry) continue;
        entry.floor.material.color.copy(tempColor(room.tempF));
        for (const win of room.windows) {
            const mesh = env.windowIndex[win.id];
            if (!mesh) continue;
            if (win.blindState === 'closed') {
                mesh.material.color.set(CONFIG.COLORS.roomWall);
                mesh.material.opacity = 0.9;
            } else if (win.blindState === 'half') {
                mesh.material.color.set(CONFIG.COLORS.window);
                mesh.material.opacity = 0.6;
            } else {
                mesh.material.color.set(CONFIG.COLORS.window);
                mesh.material.opacity = 0.3;
            }
        }
        for (const obj of room.objects) {
            const mesh = env.objectIndex[obj.id];
            if (!mesh) continue;
            const t = Math.min(1, (obj.storedHeat || 0) / STOREDHEAT_VISUAL_CAP);
            mesh.material.color.copy(lerpColorHex(mesh.userData.baseColor, CONFIG.COLORS.hot, t));
        }
    }
}

function updateRayLines(env, rays) {
    const positions = env.rayLines.geometry.attributes.position.array;
    const n = Math.min(rays.length, MAX_RAY_LINES);
    for (let i = 0; i < n; i++) {
        const ray = rays[i];
        const o = ray.origin, d = ray.direction;
        const ix = i * 6;
        positions[ix] = o.x - d.x * RAY_VISUAL_LENGTH;
        positions[ix + 1] = o.y - d.y * RAY_VISUAL_LENGTH;
        positions[ix + 2] = o.z - d.z * RAY_VISUAL_LENGTH;
        positions[ix + 3] = o.x;
        positions[ix + 4] = o.y;
        positions[ix + 5] = o.z;
    }
    env.rayLines.geometry.attributes.position.needsUpdate = true;
    env.rayLines.geometry.setDrawRange(0, n * 2);
}

// ---------------------------------------------------------------------------
// Render + resize + camera drag/zoom (self-contained, no OrbitControls dep)
// ---------------------------------------------------------------------------
function renderEnvironment3D(env) {
    const c = env.controls;
    const r = c.radius;
    env.camera.position.set(
        c.target.x + r * Math.sin(c.polar) * Math.sin(c.azimuth),
        c.target.y + r * Math.cos(c.polar),
        c.target.z + r * Math.sin(c.polar) * Math.cos(c.azimuth)
    );
    env.camera.lookAt(c.target);
    env.renderer.render(env.scene, env.camera);
}

function resizeEnvironment3D(env) {
    const w = env.canvas.clientWidth || 1, h = env.canvas.clientHeight || 1;
    env.camera.aspect = w / h;
    env.camera.updateProjectionMatrix();
    env.renderer.setSize(w, h, false);
}

function attachCameraControls(env) {
    const c = env.controls;
    let dragging = false, lastX = 0, lastY = 0;

    const onDown = (x, y) => { dragging = true; lastX = x; lastY = y; };
    const onMove = (x, y) => {
        if (!dragging) return;
        c.azimuth -= (x - lastX) * 0.006;
        c.polar = THREE.MathUtils.clamp(c.polar - (y - lastY) * 0.006, 0.2, 1.5);
        lastX = x; lastY = y;
    };
    const onUp = () => { dragging = false; };

    env.canvas.addEventListener('mousedown', e => onDown(e.clientX, e.clientY));
    window.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', onUp);
    env.canvas.addEventListener('wheel', e => {
        e.preventDefault();
        c.radius = THREE.MathUtils.clamp(c.radius + e.deltaY * 0.5, env.bounds.span * 0.4, env.bounds.span * 4);
    }, { passive: false });
    env.canvas.addEventListener('touchstart', e => { const t = e.touches[0]; onDown(t.clientX, t.clientY); }, { passive: true });
    env.canvas.addEventListener('touchmove', e => { const t = e.touches[0]; onMove(t.clientX, t.clientY); }, { passive: true });
    env.canvas.addEventListener('touchend', onUp);
}

function disposeEnvironment3D(env) {
    env.scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => m.dispose());
    });
    env.renderer.dispose();
}

// Node-compatible export guard (consistent with the rest of the codebase).
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createEnvironment3D, updateEnvironment3D, renderEnvironment3D, resizeEnvironment3D, disposeEnvironment3D };
}
