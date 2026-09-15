// js/modelData.js

const OfficeModel = {
    metadata: {
        width: 24,
        depth: 14,
        height: 3.5
    },
    colors: {
        ground: 0x7b9c6b,       // Subtle green grass outside
        floor: 0xd4d4d8,        // Grey carpet inside
        exteriorWall: 0x3f3f46, // Dark modern concrete
        interiorWall: 0xf4f4f5, // White painted walls
        glass: 0x38bdf8,        // Blue tinted glass
        wood: 0xb45309,         // Conference table
        darkWood: 0x451a03,     // Manager desk
        deskWhite: 0xffffff,
        black: 0x18181b
    },
    walls: [
        // Exterior Walls (thick, dark)
        { x: 12, z: 0, w: 24.2, h: 4, d: 0.4, type: 'exterior' }, // Back
        { x: 12, z: 14, w: 24.2, h: 4, d: 0.4, type: 'exterior' }, // Front
        { x: 0, z: 7, w: 0.4, h: 4, d: 14, type: 'exterior' }, // Left
        { x: 24, z: 7, w: 0.4, h: 4, d: 14, type: 'exterior' }, // Right
        
        // Entrance Vestibule
        { x: 12, z: 14.5, w: 4, h: 4.2, d: 1, type: 'exterior' }, 
        
        // Interior Walls (thin, white)
        { x: 15, z: 7, w: 0.2, h: 3.5, d: 14, type: 'interior' }, // Divider for left/right
        { x: 19.5, z: 7, w: 9, h: 3.5, d: 0.2, type: 'interior' } // Conf/Manager divider
    ],
    windows: [
        // Exterior Glass Panels
        { x: 12, z: 0, w: 22, h: 2.5, d: 0.6, y: 1.5 },
        { x: 6, z: 14, w: 10, h: 2.5, d: 0.6, y: 1.5 },
        { x: 18, z: 14, w: 10, h: 2.5, d: 0.6, y: 1.5 },
        { x: 0, z: 7, w: 0.6, h: 2.5, d: 12, y: 1.5 },
        { x: 24, z: 7, w: 0.6, h: 2.5, d: 12, y: 1.5 },
        
        // Interior Glass Partitions
        { x: 15, z: 3.5, w: 0.4, h: 3.5, d: 6, y: 1.75 },
        { x: 15, z: 10.5, w: 0.4, h: 3.5, d: 6, y: 1.75 }
    ],
    furniture: [
        // Desks in Workspace
        { type: "desk_cluster", x: 4.5, z: 3.5 },
        { type: "desk_cluster", x: 10.5, z: 3.5 },
        { type: "desk_cluster", x: 4.5, z: 10.5 },
        { type: "desk_cluster", x: 10.5, z: 10.5 },
        
        // Conference Room (Top Right)
        { type: "conference_table", x: 19.5, z: 3.5 },
        
        // Manager Room (Bottom Right)
        { type: "manager_desk", x: 19.5, z: 10.5 }
    ]
};
