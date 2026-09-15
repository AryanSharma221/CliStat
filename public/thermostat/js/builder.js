// js/builder.js

class HouseBuilder {
    constructor(scene) {
        this.scene = scene;
        this.currentGroup = null;
    }

    addEdges(mesh, color = 0x00aaff) {
        const edges = new THREE.EdgesGeometry(mesh.geometry);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: color, linewidth: 2, transparent: true, opacity: 0.8 }));
        mesh.add(line);
    }

    createWallsAndFloor(group, isOffice) {
        const floorGeo = new THREE.BoxGeometry(18, 0.4, 12);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 }); 
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.set(0, 0.2, 0);
        floor.receiveShadow = true;
        this.addEdges(floor, 0x0284c7);
        group.add(floor);

        const wallMat = new THREE.MeshPhysicalMaterial({
            color: 0x38bdf8, 
            transparent: true,
            opacity: 0.15,
            roughness: 0.1,
            metalness: 0.1,
            side: THREE.DoubleSide
        });

        const solidWallMat = new THREE.MeshStandardMaterial({
            color: 0x334155,
            roughness: 0.9
        });

        const backWall = new THREE.Mesh(new THREE.BoxGeometry(18, 3.5, 0.2), solidWallMat);
        backWall.position.set(0, 2.15, -5.9);
        backWall.castShadow = true;
        backWall.receiveShadow = true;
        this.addEdges(backWall, 0x1e293b);
        group.add(backWall);

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

        // Left Wall (Opaque, with Glass Window Hole)
        const leftWall = createWallWithHole(12, 3.5, 0.2, 0, 0, 4, 1.5, solidWallMat);
        leftWall.rotation.y = Math.PI / 2;
        leftWall.position.set(-8.9, 2.15, 0);
        this.addEdges(leftWall, 0x1e293b);
        const leftWindow = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 0.1), wallMat);
        leftWindow.rotation.y = Math.PI / 2;
        leftWindow.position.set(-8.9, 2.15, 0);
        group.add(leftWall, leftWindow);

        // Right Wall (Opaque, with Glass Window Hole)
        const rightWall = createWallWithHole(12, 3.5, 0.2, 0, 0, 4, 1.5, solidWallMat);
        rightWall.rotation.y = Math.PI / 2;
        rightWall.position.set(8.9, 2.15, 0);
        this.addEdges(rightWall, 0x1e293b);
        const rightWindow = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 0.1), wallMat);
        rightWindow.rotation.y = Math.PI / 2;
        rightWindow.position.set(8.9, 2.15, 0);
        group.add(rightWall, rightWindow);

        // Front Wall (Solid full-height wall)
        const frontWall = new THREE.Mesh(new THREE.BoxGeometry(18, 3.5, 0.2), solidWallMat);
        frontWall.position.set(0, 2.15, 5.9);
        frontWall.castShadow = true;
        frontWall.receiveShadow = true;
        this.addEdges(frontWall, 0x1e293b);
        group.add(frontWall);

        return { wallMat, solidWallMat };
    }

    createCeiling(group, transparentMat) {
        // Transparent Ceiling with NO Skylights/Holes
        const ceilingGeo = new THREE.BoxGeometry(18, 0.2, 12);
        const ceiling = new THREE.Mesh(ceilingGeo, transparentMat);
        ceiling.position.set(0, 4.0, 0);
        
        // Let it cast shadows if we want the glass to slightly tint the light, 
        // but transparent materials in Three.js standard shadowmap act solid unless handled specially.
        // For visual clarity, we disable castShadow on the glass ceiling so the sun enters the room fully
        // if the user expects it to be like an open roof or fully transparent to physics.
        ceiling.castShadow = false; 
        
        this.addEdges(ceiling, 0x38bdf8);
        group.add(ceiling);
    }

    buildDollhouse() {
        const group = new THREE.Group();
        const mats = this.createWallsAndFloor(group, false);

        // Divider
        const divWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.5, 8), mats.solidWallMat);
        divWall.position.set(1.5, 2.15, -1.9);
        this.addEdges(divWall, 0x1e293b);
        divWall.castShadow = true;
        group.add(divWall);

        this.createCeiling(group, mats.wallMat);

        // Bed (Right Room)
        const bedGeo = new THREE.BoxGeometry(3.5, 0.6, 4.5);
        const bedMat = new THREE.MeshStandardMaterial({ color: 0x2563eb }); 
        const bed = new THREE.Mesh(bedGeo, bedMat);
        bed.position.set(5.5, 0.7, 1.5);
        bed.castShadow = true;
        bed.receiveShadow = true;
        this.addEdges(bed, 0x1d4ed8);
        group.add(bed);

        const pillowGeo = new THREE.BoxGeometry(1.4, 0.2, 0.8);
        const pillowMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc });
        const pillow1 = new THREE.Mesh(pillowGeo, pillowMat);
        pillow1.position.set(4.6, 1.1, -0.2);
        const pillow2 = new THREE.Mesh(pillowGeo, pillowMat);
        pillow2.position.set(6.4, 1.1, -0.2);
        group.add(pillow1, pillow2);

        const lampMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
        const lamp1 = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), lampMat);
        lamp1.position.set(3.3, 1.2, -0.2);
        const lamp2 = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), lampMat);
        lamp2.position.set(7.7, 1.2, -0.2);
        group.add(lamp1, lamp2);

        const tvBase = new THREE.Mesh(new THREE.BoxGeometry(5, 0.5, 1.2), new THREE.MeshStandardMaterial({color: 0x334155}));
        tvBase.position.set(-4.5, 0.65, -5);
        tvBase.castShadow = true;
        this.addEdges(tvBase, 0x0f172a);
        group.add(tvBase);

        const tvScreen = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.0, 0.1), new THREE.MeshStandardMaterial({color: 0x0f172a, metalness: 0.8, roughness: 0.2}));
        tvScreen.position.set(-4.5, 2.2, -5.2);
        group.add(tvScreen);

        const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(6, 0.7, 2.5), new THREE.MeshStandardMaterial({color: 0x0ea5e9}));
        sofaBase.position.set(-4.5, 0.75, -1);
        sofaBase.castShadow = true;
        this.addEdges(sofaBase, 0x0284c7);
        const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(6, 1.0, 0.6), new THREE.MeshStandardMaterial({color: 0x0ea5e9}));
        sofaBack.position.set(-4.5, 1.6, 0);
        group.add(sofaBase, sofaBack);

        const island = new THREE.Mesh(new THREE.BoxGeometry(4, 1.4, 1.8), new THREE.MeshStandardMaterial({color: 0xf8fafc}));
        island.position.set(-4.5, 1.1, 3.5);
        island.castShadow = true;
        this.addEdges(island, 0x94a3b8);
        group.add(island);

        const ac = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.6, 0.5), new THREE.MeshBasicMaterial({color: 0x22d3ee}));
        ac.position.set(1.5, 3.2, -5.6);
        group.add(ac);

        this.currentGroup = group;
        this.scene.add(group);
    }

    buildOffice() {
        const group = new THREE.Group();
        const mats = this.createWallsAndFloor(group, true);

        this.createCeiling(group, mats.wallMat);

        const createDesk = (x, z, rotY = 0) => {
            const deskGroup = new THREE.Group();
            const top = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.1, 1.8), new THREE.MeshStandardMaterial({color: 0xf1f5f9}));
            top.position.set(0, 1.4, 0);
            top.castShadow = true;
            this.addEdges(top, 0x94a3b8);
            deskGroup.add(top);

            const legMat = new THREE.MeshStandardMaterial({color: 0x334155, metalness: 0.8});
            const legGeo = new THREE.BoxGeometry(0.1, 1.4, 0.1);
            const leg1 = new THREE.Mesh(legGeo, legMat); leg1.position.set(-1.6, 0.7, -0.8);
            const leg2 = new THREE.Mesh(legGeo, legMat); leg2.position.set(1.6, 0.7, -0.8);
            const leg3 = new THREE.Mesh(legGeo, legMat); leg3.position.set(-1.6, 0.7, 0.8);
            const leg4 = new THREE.Mesh(legGeo, legMat); leg4.position.set(1.6, 0.7, 0.8);
            deskGroup.add(leg1, leg2, leg3, leg4);

            const monitor = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 0.1), new THREE.MeshStandardMaterial({color: 0x0f172a, metalness: 0.8}));
            monitor.position.set(0, 1.8, -0.5);
            deskGroup.add(monitor);

            deskGroup.position.set(x, 0, z);
            deskGroup.rotation.y = rotY;
            return deskGroup;
        };

        const createChair = (x, z, rotY = 0) => {
            const chairGroup = new THREE.Group();
            const mat = new THREE.MeshStandardMaterial({color: 0x2563eb});
            
            const seat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.8), mat);
            seat.position.set(0, 0.9, 0);
            seat.castShadow = true;
            chairGroup.add(seat);

            const back = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.1), mat);
            back.position.set(0, 1.3, 0.4);
            chairGroup.add(back);

            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9), new THREE.MeshStandardMaterial({color: 0x94a3b8}));
            stem.position.set(0, 0.45, 0);
            chairGroup.add(stem);

            chairGroup.position.set(x, 0, z);
            chairGroup.rotation.y = rotY;
            return chairGroup;
        };

        group.add(createDesk(-4, -2.5, 0));
        group.add(createChair(-4, -1.5, 0));

        group.add(createDesk(-4, 0.5, 0));
        group.add(createChair(-4, 1.5, 0));

        group.add(createDesk(-4, 3.5, 0));
        group.add(createChair(-4, 4.5, 0));

        const confTable = new THREE.Mesh(new THREE.BoxGeometry(6, 0.2, 2.5), new THREE.MeshStandardMaterial({color: 0x475569, roughness: 0.3}));
        confTable.position.set(4.5, 1.4, 0);
        confTable.castShadow = true;
        this.addEdges(confTable, 0x1e293b);
        group.add(confTable);

        const confBase = new THREE.Mesh(new THREE.BoxGeometry(3, 1.3, 1), new THREE.MeshStandardMaterial({color: 0x0f172a}));
        confBase.position.set(4.5, 0.7, 0);
        group.add(confBase);

        group.add(createChair(2.5, -1.8, Math.PI));
        group.add(createChair(4.5, -1.8, Math.PI));
        group.add(createChair(6.5, -1.8, Math.PI));
        
        group.add(createChair(2.5, 1.8, 0));
        group.add(createChair(4.5, 1.8, 0));
        group.add(createChair(6.5, 1.8, 0));

        const presentationScreen = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.5, 0.1), new THREE.MeshBasicMaterial({color: 0x1e293b}));
        presentationScreen.position.set(4.5, 2.5, -5.7);
        this.addEdges(presentationScreen, 0x38bdf8);
        group.add(presentationScreen);

        const ac = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.6, 0.5), new THREE.MeshBasicMaterial({color: 0x22d3ee}));
        ac.position.set(0, 3.2, -5.6);
        group.add(ac);

        this.currentGroup = group;
        this.scene.add(group);
    }

    build(type = 'household') {
        if (this.currentGroup) {
            this.scene.remove(this.currentGroup);
            this.currentGroup = null;
        }
        if (type.toLowerCase().includes('office')) {
            this.buildOffice();
        } else {
            this.buildDollhouse();
        }
    }
}
