const CONFIG = {
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

    ASHRAE_METABOLIC_HEAT: 0.12, 
    U_ENVELOPE: 0.35,            
    LATENT_HEAT_COEFF: 0.003,    
    THERMAL_DECAY_RATE: 0.02,    
    
    ELECTRICITY_PRICE_PEAK: 0.25,   
    ELECTRICITY_PRICE_OFFPEAK: 0.12,
    GRID_CARBON_INTENSITY: 0.4,     

    PID: {
        Kp: 3.0,
        Ki: 0.05,
        Kd: 1.5,
        Kff: 2.0
    },

    ROOM_CONNECTIONS: [
        { from: 'living_room', to: 'bedroom', diffusionRate: 0.05, type: 'wall' },
        { from: 'living_room', to: 'kitchen', diffusionRate: 0.08, type: 'door' }
    ],

    ROOMS: [
        {
            id: 'living_room',
            name: 'Living Room',
            x: 50, y: 50, width: 600, height: 400,
            targetTempF: 72, tempF: 72,
            windows: [
                { id: 'w1', roomId: 'living_room', x: 50, y: 50, width: 200, height: 10, orientation: 'N', blindState: 'open' },
                { id: 'w2', roomId: 'living_room', x: 50, y: 440, width: 300, height: 10, orientation: 'S', blindState: 'open' }
            ],
            objects: [
                { id: 'sofa1', roomId: 'living_room', label: 'Dark Sofa', x: 100, y: 150, width: 150, height: 60, thermalMass: 0.8, storedHeat: 0, bbox: {x: 100, y: 150, width: 150, height: 60} },
                { id: 'tv1', roomId: 'living_room', label: 'Television', x: 500, y: 80, width: 20, height: 100, thermalMass: 0.3, storedHeat: 0, bbox: {x: 500, y: 80, width: 20, height: 100} },
                { id: 'table1', roomId: 'living_room', label: 'Coffee Table', x: 120, y: 250, width: 100, height: 80, thermalMass: 0.5, storedHeat: 0, bbox: {x: 120, y: 250, width: 100, height: 80} }
            ]
        },
        {
            id: 'bedroom',
            name: 'Master Bedroom',
            x: 700, y: 50, width: 400, height: 300,
            targetTempF: 68, tempF: 72,
            windows: [
                { id: 'w3', roomId: 'bedroom', x: 700, y: 50, width: 150, height: 10, orientation: 'N', blindState: 'open' },
                { id: 'w4', roomId: 'bedroom', x: 1090, y: 100, width: 10, height: 150, orientation: 'E', blindState: 'open' }
            ],
            objects: [
                { id: 'bed1', roomId: 'bedroom', label: 'Large Bed', x: 750, y: 100, width: 200, height: 180, thermalMass: 0.6, storedHeat: 0, bbox: {x: 750, y: 100, width: 200, height: 180} }
            ]
        },
        {
            id: 'kitchen',
            name: 'Kitchen',
            x: 700, y: 400, width: 400, height: 250,
            targetTempF: 70, tempF: 72,
            windows: [
                { id: 'w5', roomId: 'kitchen', x: 1090, y: 450, width: 10, height: 100, orientation: 'E', blindState: 'open' }
            ],
            objects: [
                { id: 'oven', roomId: 'kitchen', label: 'Oven', x: 720, y: 420, width: 60, height: 60, thermalMass: 0.9, storedHeat: 0, bbox: {x: 720, y: 420, width: 60, height: 60} },
                { id: 'fridge', roomId: 'kitchen', label: 'Refrigerator', x: 800, y: 420, width: 70, height: 80, thermalMass: 0.7, storedHeat: 0, bbox: {x: 800, y: 420, width: 70, height: 80} }
            ]
        }
    ]
};\n