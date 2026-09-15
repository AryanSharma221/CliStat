// js/app.js

document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize Viewer
    const viewer = new OfficeViewer('canvas-container');

    // 2. Build 3D Model from Config Data
    const builder = new HouseBuilder(viewer.scene);
    const envSelect = document.getElementById('environment-select');
    if (envSelect) {
        builder.build(envSelect.value);
        envSelect.addEventListener('change', (e) => {
            builder.build(e.target.value);
            console.log("Switched layout to", e.target.value);
        });
    } else {
        builder.build('office');
    }

    // 3. Initialize Environmental Simulation
    const simulation = new EnvironmentSimulation(viewer.scene);
    simulation.updateSunPosition();

    // 4. Initialize UI
    const ui = new UIController(simulation);

    // 5. Main Game/Animation Loop
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        
        const dt = clock.getDelta();
        
        // Update UI/Animation
        ui.update(dt);
        
        // Render Scene
        viewer.render();
    }

    animate();
});
