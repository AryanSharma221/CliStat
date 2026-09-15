// js/config.js
// =============================================================================
// MEMBER 1 — Physics & Environment Architect (Data Layer)
// -----------------------------------------------------------------------------
// Room topology, furniture, windows, and physical constants for the digital
// twin. This is the household 3-room preset from the architecture doc (§18),
// extended with real 3D fields so the sun/collision engine can do genuine
// ray-vs-object intersection instead of a flat top-down approximation.
//
// BACKWARD COMPATIBLE ON PURPOSE: every field the renderer/UI already expects
// (x, y, width, height, orientation, blindState, thermalMass, storedHeat) is
// untouched. The only additions are new fields (marked "// 3D:") that a 2D
// canvas renderer can simply ignore.
//
// Ownership note for the team: PID / controller-tuning constants and audience
// (premium/economy) cost-function weights are intentionally left as empty
// placeholders below — that's the Controller/HVAC teammate's call, not mine.
// =============================================================================

const CONFIG = {
    // ---------------- Canvas & Layout (unchanged, for the renderer) --------
    CANVAS_WIDTH: 1200,
    CANVAS_HEIGHT: 700,

    COLORS: {
        background: '#121212',
        roomWall: '#333333',
        window: '#add8e6',
        sunRay: 'rgba(255, 235, 59, 0.4)',
        hot: '#ff5252',
        cold: '#00e5ff',
        text: '#e0e0e0'
    },

    // ---------------- Physical Constants (Data Layer owns this) ------------
    PHYSICS: {
        // Solar / sky
        LATITUDE: 19.07,             // degrees N — Mumbai, per architecture §11 default
        DEFAULT_DAY_OF_YEAR: 172,    // June 21 — summer solstice, steepest/most dramatic rays

        // Q_predicted vectors (architecture §3 Module 5)
        ASHRAE_METABOLIC_HEAT: 0.12, // kW per person
        U_ENVELOPE: 0.35,            // W/m^2*K (insulation factor)
        A_ENVELOPE: 45,              // m^2 (building envelope area)
        LATENT_HEAT_COEFF: 0.003,    // humidity impact scalar
        THERMAL_DECAY_RATE: 0.02,    // exponential decay lambda for stored heat

        // Multi-room heat transfer (architecture §3 Module 11)
        // NOTE: the architecture doc's draft value here was 500. Running a
        // full no-AC day through test-data-layer.js showed that at 500 the
        // envelope+occupancy load alone pins every room at the 120F safety
        // ceiling within about an hour, before a controller ever gets a
        // chance to do anything — see the test output for the before/after.
        // 10000 was picked empirically (see sweep in test notes) so that:
        //   - a room left uncooled drifts to an uncomfortable-but-bounded
        //     ~96-110F over a 12h day (a real "why you need this" story), and
        //   - the given HVAC_COOLING_POWER below still has real authority
        //     (~15-25% constant duty cycle holds setpoint on a hot day, so
        //     PID/MPC has a meaningful, non-trivial job to do).
        // This is a tuning constant, not an interface change — everything
        // that reads it keeps working. Retune again once the controller is
        // in and you can feel the response live.
        ROOM_THERMAL_CAPACITANCE: 10000,
        HVAC_COOLING_POWER: 5.0,     // kW-equivalent, per room's AC unit (kept as spec'd — already has good authority at the capacitance above)
        WALL_CONDUCTANCE: 0.15,      // heat transfer rate through interior walls
        DOOR_CONDUCTANCE: 0.60,      // heat transfer rate through open doorways

        // Safety bounds (verification checklist: no NaN/Infinity, 50-120F range)
        MIN_TEMP_C: 10,
        MAX_TEMP_C: 50,

        // 3D geometry defaults — used when a room/window/object doesn't
        // specify its own value. All in the same "world units" as the
        // existing 2D x/y/width/height (not real-world meters/feet).
        DEFAULT_ROOM_HEIGHT: 90,     // ceiling height
        DEFAULT_SILL_HEIGHT: 30,     // window bottom, off the floor
        DEFAULT_WINDOW_HEIGHT: 45,   // window opening's vertical extent
        DEFAULT_OBJECT_HEIGHT: 40,   // furniture vertical extent, if unspecified

        // Ray sampling grid per window for 3D collision (gridW x gridH rays)
        RAY_GRID_WIDTH: 5,
        RAY_GRID_HEIGHT: 4
    },

    // ---------------- Placeholders owned by the Controller/HVAC teammate ---
    // Left empty on purpose — do not fill these in from the data layer.
    PID: {},
    AUDIENCE_PROFILES: {},

    // ---------------- Economics & Grid (data, not a control decision) ------
    ELECTRICITY_PRICE_PEAK: 0.25,    // $/kWh (4pm-9pm)
    ELECTRICITY_PRICE_OFFPEAK: 0.12, // $/kWh (other times)
    GRID_CARBON_INTENSITY: 0.4,      // kg CO2 / kWh

    // ---------------- Topology & Rooms --------------------------------------
    ROOM_CONNECTIONS: [
        { roomA: 'living_room', roomB: 'bedroom', type: 'wall' },
        { roomA: 'living_room', roomB: 'kitchen', type: 'door' },
        { roomA: 'bedroom', roomB: 'kitchen', type: 'wall' }
    ],

    ROOMS: [
        {
            id: 'living_room',
            name: 'Living Room',
            x: 50, y: 50, width: 600, height: 400,
            targetTempF: 72,
            tempC: 24.5,                  // initial temperature
            // 3D: roomHeight defaults to PHYSICS.DEFAULT_ROOM_HEIGHT if omitted
            windows: [
                { id: 'w1', x: 50, y: 50, width: 200, height: 10, orientation: 'N', blindState: 'open' },
                { id: 'w2', x: 50, y: 440, width: 300, height: 10, orientation: 'S', blindState: 'open' }
            ],
            objects: [
                // 3D: z = base height off floor, objHeight = vertical extent
                { id: 'sofa1', label: 'Dark Sofa', x: 100, y: 150, width: 150, height: 60, z: 0, objHeight: 35, thermalMass: 0.8, storedHeat: 0 },
                { id: 'tv1', label: 'Television', x: 500, y: 80, width: 20, height: 100, z: 40, objHeight: 25, thermalMass: 0.3, storedHeat: 0 },
                { id: 'table1', label: 'Coffee Table', x: 120, y: 250, width: 100, height: 80, z: 0, objHeight: 18, thermalMass: 0.5, storedHeat: 0 }
            ]
        },
        {
            id: 'bedroom',
            name: 'Master Bedroom',
            x: 700, y: 50, width: 400, height: 300,
            targetTempF: 68,
            tempC: 23.5,
            windows: [
                { id: 'w3', x: 700, y: 50, width: 150, height: 10, orientation: 'N', blindState: 'open' },
                { id: 'w4', x: 1090, y: 100, width: 10, height: 150, orientation: 'E', blindState: 'open' }
            ],
            objects: [
                { id: 'bed1', label: 'Large Bed', x: 750, y: 100, width: 200, height: 180, z: 0, objHeight: 24, thermalMass: 0.6, storedHeat: 0 }
            ]
        },
        {
            id: 'kitchen',
            name: 'Kitchen',
            x: 700, y: 400, width: 400, height: 250,
            targetTempF: 70,
            tempC: 24.0,
            windows: [
                { id: 'w5', x: 1090, y: 450, width: 10, height: 100, orientation: 'E', blindState: 'open' }
            ],
            objects: [
                { id: 'oven', label: 'Oven', x: 720, y: 420, width: 60, height: 60, z: 0, objHeight: 35, thermalMass: 0.9, storedHeat: 0 },
                { id: 'fridge', label: 'Refrigerator', x: 800, y: 420, width: 70, height: 80, z: 0, objHeight: 65, thermalMass: 0.7, storedHeat: 0 }
            ]
        }
    ]
};

// Node-compatible export guard (see vec3.js for why this pattern is used).
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG };
}
