// js/builder.js

// js/builder.js

class HouseBuilder {
    constructor(scene) {
        this.scene = scene;
    }

    // Helper to add CAD-like outlines to objects
    addEdges(mesh, color = 0x00aaff) {
        const edges = new THREE.EdgesGeometry(mesh.geometry);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: color, linewidth: 2, transparent: true, opacity: 0.8 }));
        mesh.add(line);
    }

    buildDollhouse() {
        const group = new THREE.Group();

        // 1. Floor (Dark base to contrast with light UI)
        const floorGeo = new THREE.BoxGeometry(18, 0.4, 12);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 }); // Dark slate
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.set(0, 0.2, 0);
        floor.receiveShadow = true;
        this.addEdges(floor, 0x0284c7);
        group.add(floor);

        // Wall Material (Translucent Architectural Glass)
        const wallMat = new THREE.MeshPhysicalMaterial({
            color: 0x38bdf8, 
            transparent: true,
            opacity: 0.15,
            roughness: 0.1,
            metalness: 0.1,
            side: THREE.DoubleSide
        });

        // Opaque Wall Material for the back wall
        const solidWallMat = new THREE.MeshStandardMaterial({
            color: 0x334155, // Slate 700
            roughness: 0.9
        });

        // 2. Back Wall (Solid)
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(18, 3.5, 0.2), solidWallMat);
        backWall.position.set(0, 2.15, -5.9);
        backWall.castShadow = true;
        backWall.receiveShadow = true;
        this.addEdges(backWall, 0x38bdf8);
        group.add(backWall);

        // Helper to create a wall with a rectangular hole
        const createWallWithHole = (width, height, thickness, holeX, holeY, holeW, holeH, material) => {
            const shape = new THREE.Shape();
            shape.moveTo(-width/2, -height/2);
            shape.lineTo(width/2, -height/2);
            shape.lineTo(width/2, height/2);
            shape.lineTo(-width/2, height/2);
            shape.lineTo(-width/2, -height/2);

            const hole = new THREE.Path();
            hole.moveTo(holeX - holeW/2, holeY - holeH/2);
            hole.lineTo(holeX + holeW/2, holeY - holeH/2);
            hole.lineTo(holeX + holeW/2, holeY + holeH/2);
            hole.lineTo(holeX - holeW/2, holeY + holeH/2);
            hole.lineTo(holeX - holeW/2, holeY - holeH/2);
            shape.holes.push(hole);

            const extrudeSettings = { depth: thickness, bevelEnabled: false };
            const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            geo.translate(0, 0, -thickness/2);
            const mesh = new THREE.Mesh(geo, material);
            mesh.castShadow = true;
            return mesh;
        };

        // 3. Left Wall (Transparent, with Window Hole)
        const leftWall = createWallWithHole(12, 3.5, 0.2, 0, 0, 4, 1.5, wallMat);
        leftWall.rotation.y = Math.PI / 2;
        leftWall.position.set(-8.9, 2.15, 0);
        this.addEdges(leftWall, 0x38bdf8);
        group.add(leftWall);

        // 4. Right Wall (Transparent, with Window Hole)
        const rightWall = createWallWithHole(12, 3.5, 0.2, 0, 0, 4, 1.5, wallMat);
        rightWall.rotation.y = Math.PI / 2;
        rightWall.position.set(8.9, 2.15, 0);
        this.addEdges(rightWall, 0x38bdf8);
        group.add(rightWall);

        // 5. Front Wall (Low cutaway so we see inside)
        const frontWall = new THREE.Mesh(new THREE.BoxGeometry(18, 0.8, 0.2), wallMat);
        frontWall.position.set(0, 0.8, 5.9);
        frontWall.castShadow = true;
        this.addEdges(frontWall, 0x38bdf8);
        group.add(frontWall);

        // Floating Lintel (Front top edge framing)
        const lintel = new THREE.Mesh(new THREE.BoxGeometry(18, 0.2, 0.2), solidWallMat);
        lintel.position.set(0, 3.8, 5.9);
        this.addEdges(lintel, 0x38bdf8);
        lintel.castShadow = true;
        group.add(lintel);

        // 6. Interior Divider Wall (Transparent)
        const divWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.5, 8), wallMat);
        divWall.position.set(1.5, 2.15, -1.9);
        this.addEdges(divWall, 0x38bdf8);
        divWall.castShadow = true;
        group.add(divWall);

        // 6b. Transparent Ceiling with 1 Skylight Window
        const ceilingShape = new THREE.Shape();
        ceilingShape.moveTo(-9, -6);
        ceilingShape.lineTo(9, -6);
        ceilingShape.lineTo(9, 6);
        ceilingShape.lineTo(-9, 6);
        ceilingShape.lineTo(-9, -6);

        // Add 1 window hole (over the Drawing Room / Sofa area)
        const addHole = (x, z, w, d) => {
            const hole = new THREE.Path();
            hole.moveTo(x - w/2, z - d/2);
            hole.lineTo(x + w/2, z - d/2);
            hole.lineTo(x + w/2, z + d/2);
            hole.lineTo(x - w/2, z + d/2);
            hole.lineTo(x - w/2, z - d/2);
            ceilingShape.holes.push(hole);
        };
        addHole(-4.5, -2, 3, 3); // Single large skylight over the drawing room

        const extrudeSettings = { depth: 0.2, bevelEnabled: false };
        const ceilingGeo = new THREE.ExtrudeGeometry(ceilingShape, extrudeSettings);
        ceilingGeo.rotateX(Math.PI / 2);
        
        const ceiling = new THREE.Mesh(ceilingGeo, wallMat);
        ceiling.position.set(0, 4.0, 0);
        ceiling.castShadow = true; // Blocks light everywhere EXCEPT the hole
        this.addEdges(ceiling, 0x38bdf8);
        group.add(ceiling);


        // 7. FURNITURE

        // Bed (Right Room)
        const bedGeo = new THREE.BoxGeometry(3.5, 0.6, 4.5);
        const bedMat = new THREE.MeshStandardMaterial({ color: 0x2563eb }); // Blue bed
        const bed = new THREE.Mesh(bedGeo, bedMat);
        bed.position.set(5.5, 0.7, 1.5);
        bed.castShadow = true;
        bed.receiveShadow = true;
        this.addEdges(bed, 0x1d4ed8);
        group.add(bed);

        // Pillows
        const pillowGeo = new THREE.BoxGeometry(1.4, 0.2, 0.8);
        const pillowMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc });
        const pillow1 = new THREE.Mesh(pillowGeo, pillowMat);
        pillow1.position.set(4.6, 1.1, -0.2);
        const pillow2 = new THREE.Mesh(pillowGeo, pillowMat);
        pillow2.position.set(6.4, 1.1, -0.2);
        group.add(pillow1, pillow2);

        // Lamps (Glowing orange spheres next to bed)
        const lampMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
        const lamp1 = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), lampMat);
        lamp1.position.set(3.3, 1.2, -0.2);
        const lamp2 = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), lampMat);
        lamp2.position.set(7.7, 1.2, -0.2);
        group.add(lamp1, lamp2);

        // TV / Entertainment (Left Room)
        const tvBase = new THREE.Mesh(new THREE.BoxGeometry(5, 0.5, 1.2), new THREE.MeshStandardMaterial({color: 0x334155}));
        tvBase.position.set(-4.5, 0.65, -5);
        tvBase.castShadow = true;
        this.addEdges(tvBase, 0x0f172a);
        group.add(tvBase);

        const tvScreen = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.0, 0.1), new THREE.MeshStandardMaterial({color: 0x0f172a, metalness: 0.8, roughness: 0.2}));
        tvScreen.position.set(-4.5, 2.2, -5.2);
        group.add(tvScreen);

        // Sofa (Left Room)
        const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(6, 0.7, 2.5), new THREE.MeshStandardMaterial({color: 0x0ea5e9}));
        sofaBase.position.set(-4.5, 0.75, -1);
        sofaBase.castShadow = true;
        this.addEdges(sofaBase, 0x0284c7);
        const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(6, 1.0, 0.6), new THREE.MeshStandardMaterial({color: 0x0ea5e9}));
        sofaBack.position.set(-4.5, 1.6, 0);
        group.add(sofaBase, sofaBack);

        // Kitchen Island (Center/Left)
        const island = new THREE.Mesh(new THREE.BoxGeometry(4, 1.4, 1.8), new THREE.MeshStandardMaterial({color: 0xf8fafc}));
        island.position.set(-4.5, 1.1, 3.5);
        island.castShadow = true;
        this.addEdges(island, 0x94a3b8);
        group.add(island);

        // AC Unit on Back Wall (Glowing cyan)
        const ac = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.6, 0.5), new THREE.MeshBasicMaterial({color: 0x22d3ee}));
        ac.position.set(1.5, 3.2, -5.6);
        group.add(ac);

        this.scene.add(group);
    }

    build() {
        this.buildDollhouse();
    }
}
