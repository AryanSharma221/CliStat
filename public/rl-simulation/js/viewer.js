// js/viewer.js

class OfficeViewer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        
        // Setup Scene
        this.scene = new THREE.Scene();
        // Deep navy background to seamlessly blend with the HUD UI
        this.scene.background = new THREE.Color(0x030811); 
        
        // Setup Camera with a default aspect ratio
        // Position camera to look at the architectural dollhouse
        this.camera = new THREE.PerspectiveCamera(45, 16/9, 0.1, 1000);
        this.camera.position.set(-10, 18, 22);
        
        // Setup Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        // Set a default size, will be overwritten by onWindowResize
        this.renderer.setSize(800, 600);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Make the renderer output look a bit softer and brighter
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        
        this.container.appendChild(this.renderer.domElement);
        
        // Setup Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        // Center the controls on the house
        this.controls.target.set(0, 2, 0); 
        this.controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent camera from going below ground
        
        // Smooth damping for professional feel
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.update();

        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        
        // Call resize initially to ensure exact fit
        setTimeout(() => this.onWindowResize(), 100);
    }

    onWindowResize() {
        if (!this.container) return;
        const rect = this.container.parentElement.getBoundingClientRect();
        const width = rect.width || 800;
        const height = rect.height || 600;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    render() {
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}
