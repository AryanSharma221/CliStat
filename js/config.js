// js/config.js

const CONFIG = {
    // ---------------- Canvas & Layout ----------------
    CANVAS_WIDTH: 1200,
    CANVAS_HEIGHT: 700,
    
    // ---------------- UI Colors ----------------------
    COLORS: {
        background: '#121212',
        roomWall: '#333333',
        roomFill: '#1a1a1a',
        window: '#add8e6',
        windowBlindClosed: '#555555',
        windowBlindHalf: '#8899aa',
        sunRay: 'rgba(255, 235, 59, 0.4)',
        hot: '#ff5252',
        cold: '#00e5ff',
        text: '#e0e0e0',
        accent: '#00e5ff',
        success: '#69f0ae',
        warning: '#ffd740',
        danger: '#ff5252'
    },

    // ---------------- Physical Constants -------------
    ASHRAE_METABOLIC_HEAT: 0.12,
    U_ENVELOPE: 0.35,
    LATENT_HEAT_COEFF: 0.003,
    THERMAL_DECAY_RATE: 0.02,
    ROOM_THERMAL_CAPACITANCE: 500,
    HVAC_COOLING_POWER: 5.0,
    WALL_CONDUCTANCE: 0.15,
    DOOR_CONDUCTANCE: 0.60,
    
    // ---------------- Economics & Grid ---------------
    ELECTRICITY_PRICE_PEAK: 0.25,
    ELECTRICITY_PRICE_OFFPEAK: 0.12,
    GRID_CARBON_INTENSITY: 0.4,

    // ---------------- Controller Params --------------
    PID: { Kp: 3.0, Ki: 0.05, Kd: 1.5, Kff: 2.0 },

    // =====================================================
    //  TWO ENVIRONMENT PRESETS: Household vs Commercial
    // =====================================================

    ENVIRONMENTS: {

        // ─────────────────────────────────────────────────
        //  PRESET 1: 🏠 HOUSEHOLD (3-Room Apartment)
        //  Occupancy: 1-4 people, WiFi ~6-11 devices
        //  Challenge: Solar heat through windows
        // ─────────────────────────────────────────────────
        household: {
            name: '🏠 Household (3-Room Apartment)',
            description: 'A residential apartment with living room, bedroom, and kitchen. Solar heat is the primary threat.',
            isCommercial: false,
            occupancy: {
                maxPeople: 4,
                baselineWiFiDevices: 3,   // smart speakers, TV, router
                devicesPerPerson: 2.0,    // phone + laptop
                baseNoiseDb: 30,
                noisePerPerson: 7
            },
            connections: [
                { roomA: 'living_room', roomB: 'bedroom',  type: 'wall', area: 15 },
                { roomA: 'living_room', roomB: 'kitchen',   type: 'door', area: 3  },
                { roomA: 'bedroom',     roomB: 'kitchen',   type: 'wall', area: 10 }
            ],
            rooms: [
                {
                    id: 'living_room',
                    label: 'Living Room',
                    facing: 'west',
                    bbox: { x: 50, y: 50, width: 400, height: 300 },
                    targetTempF: 72,
                    tempF: 72,
                    windows: [
                        { id: 'lr_win1', x: 50, y: 50, width: 150, facing: 'west', blindState: 'open' }
                    ],
                    objects: [
                        { id: 'dark_sofa', label: 'Dark Leather Sofa', bbox: { x: 150, y: 200, width: 180, height: 80 }, color: '#3B2F2F', thermalMass: 0.90, storedHeat: 0 },
                        { id: 'glass_table', label: 'Glass Coffee Table', bbox: { x: 350, y: 220, width: 80, height: 50 }, color: '#B0E0E6', thermalMass: 0.15, storedHeat: 0 },
                        { id: 'dark_rug', label: 'Dark Area Rug', bbox: { x: 120, y: 250, width: 200, height: 80 }, color: '#2F1B14', thermalMass: 0.75, storedHeat: 0 }
                    ],
                    appliances: { lights: 3, fans: 1, monitors: 1 }
                },
                {
                    id: 'bedroom',
                    label: 'Bedroom',
                    facing: 'east',
                    bbox: { x: 500, y: 50, width: 350, height: 250 },
                    targetTempF: 70,
                    tempF: 72,
                    windows: [
                        { id: 'br_win1', x: 500, y: 50, width: 120, facing: 'east', blindState: 'open' }
                    ],
                    objects: [
                        { id: 'wood_bed', label: 'Wooden Bed Frame', bbox: { x: 570, y: 100, width: 160, height: 120 }, color: '#8B4513', thermalMass: 0.55, storedHeat: 0 },
                        { id: 'dark_curtains', label: 'Dark Curtains', bbox: { x: 500, y: 50, width: 30, height: 100 }, color: '#1a1a2e', thermalMass: 0.65, storedHeat: 0 }
                    ],
                    appliances: { lights: 2, fans: 1, monitors: 0 }
                },
                {
                    id: 'kitchen',
                    label: 'Kitchen',
                    facing: 'north',
                    bbox: { x: 50, y: 400, width: 350, height: 250 },
                    targetTempF: 72,
                    tempF: 72,
                    windows: [
                        { id: 'kt_win1', x: 50, y: 400, width: 100, facing: 'north', blindState: 'open' }
                    ],
                    objects: [
                        { id: 'granite_counter', label: 'Granite Counter', bbox: { x: 100, y: 450, width: 200, height: 40 }, color: '#2F4F4F', thermalMass: 0.70, storedHeat: 0 },
                        { id: 'steel_fridge', label: 'Steel Refrigerator', bbox: { x: 330, y: 420, width: 50, height: 80 }, color: '#C0C0C0', thermalMass: 0.30, storedHeat: 0 }
                    ],
                    appliances: { lights: 2, fans: 1, monitors: 0 }
                }
            ]
        },

        // ─────────────────────────────────────────────────
        //  PRESET 2: 🏬 COMMERCIAL (Office + Server Room)
        //  Occupancy: 5-25 people, WiFi ~20-60 devices
        //  Challenge: High occupancy heat + server room 24/7 heat
        // ─────────────────────────────────────────────────
        commercial: {
            name: '🏬 Commercial (Office + Server Room)',
            description: 'An open-plan office with a glass meeting room and a server closet that generates heat 24/7.',
            isCommercial: true,
            occupancy: {
                maxPeople: 25,
                baselineWiFiDevices: 8,   // printers, smart displays, access points
                devicesPerPerson: 2.5,    // phone + laptop + tablet
                baseNoiseDb: 35,          // HVAC hum + printer noise
                noisePerPerson: 5
            },
            connections: [
                { roomA: 'open_floor', roomB: 'meeting_room', type: 'door', area: 4 },
                { roomA: 'open_floor', roomB: 'server_room',  type: 'wall', area: 8 }
            ],
            rooms: [
                {
                    id: 'open_floor',
                    label: 'Open-Plan Floor',
                    facing: 'south',
                    bbox: { x: 50, y: 50, width: 700, height: 350 },
                    targetTempF: 71,
                    tempF: 72,
                    windows: [
                        { id: 'of_win1', x: 50, y: 380, width: 300, facing: 'south', blindState: 'open' },
                        { id: 'of_win2', x: 400, y: 380, width: 300, facing: 'south', blindState: 'open' }
                    ],
                    objects: [
                        { id: 'desk_cluster_1', label: 'Desk Cluster A (8 desks)', bbox: { x: 100, y: 100, width: 250, height: 120 }, color: '#5C4033', thermalMass: 0.45, storedHeat: 0 },
                        { id: 'desk_cluster_2', label: 'Desk Cluster B (8 desks)', bbox: { x: 400, y: 100, width: 250, height: 120 }, color: '#5C4033', thermalMass: 0.45, storedHeat: 0 },
                        { id: 'dark_carpet', label: 'Dark Office Carpet', bbox: { x: 80, y: 250, width: 600, height: 100 }, color: '#1a1a2e', thermalMass: 0.80, storedHeat: 0 },
                        { id: 'printer_station', label: 'Printer & Copier', bbox: { x: 650, y: 80, width: 60, height: 60 }, color: '#444444', thermalMass: 0.35, storedHeat: 0 }
                    ],
                    appliances: { lights: 12, fans: 4, monitors: 16 }
                },
                {
                    id: 'meeting_room',
                    label: 'Glass Meeting Room',
                    facing: 'south',
                    bbox: { x: 800, y: 50, width: 250, height: 200 },
                    targetTempF: 70,
                    tempF: 72,
                    windows: [
                        { id: 'mr_win1', x: 800, y: 230, width: 200, facing: 'south', blindState: 'open' }
                    ],
                    objects: [
                        { id: 'conf_table', label: 'Conference Table', bbox: { x: 830, y: 90, width: 180, height: 100 }, color: '#2F1B14', thermalMass: 0.70, storedHeat: 0 },
                        { id: 'projector', label: 'Ceiling Projector', bbox: { x: 900, y: 60, width: 40, height: 20 }, color: '#333333', thermalMass: 0.10, storedHeat: 0 }
                    ],
                    appliances: { lights: 4, fans: 1, monitors: 2 }
                },
                {
                    id: 'server_room',
                    label: 'Server Closet',
                    facing: 'none',
                    bbox: { x: 800, y: 300, width: 250, height: 180 },
                    targetTempF: 65,
                    tempF: 68,
                    windows: [],
                    objects: [
                        { id: 'server_rack_1', label: 'Server Rack A', bbox: { x: 820, y: 320, width: 80, height: 140 }, color: '#111111', thermalMass: 0.95, storedHeat: 0.5 },
                        { id: 'server_rack_2', label: 'Server Rack B', bbox: { x: 920, y: 320, width: 80, height: 140 }, color: '#111111', thermalMass: 0.95, storedHeat: 0.5 },
                        { id: 'ups_battery', label: 'UPS Battery Bank', bbox: { x: 870, y: 460, width: 60, height: 30 }, color: '#333300', thermalMass: 0.40, storedHeat: 0.2 }
                    ],
                    appliances: { lights: 1, fans: 6, monitors: 0 }
                }
            ]
        }
    },

    // Default starting environment
    ACTIVE_ENVIRONMENT: 'household'
};

// ═══════════════════════════════════════════════════════
//  ENVIRONMENT HELPERS (Global)
// ═══════════════════════════════════════════════════════
function getActiveEnvironment() {
    return CONFIG.ENVIRONMENTS[CONFIG.ACTIVE_ENVIRONMENT];
}
function getActiveRooms() {
    return JSON.parse(JSON.stringify(getActiveEnvironment().rooms));
}
function getActiveConnections() {
    return getActiveEnvironment().connections;
}
function isCommercialMode() {
    return getActiveEnvironment().isCommercial === true;
}
