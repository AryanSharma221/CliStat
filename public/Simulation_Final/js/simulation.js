// js/simulation.js

class EnvironmentSimulation {
    constructor(scene) {
        this.scene = scene;
        
        // Setup Hemisphere Light (Sky and Ground bounce)
        this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x111122, 0.4);
        this.scene.add(this.hemiLight);

        // Setup Directional Light (Sun)
        this.sunLight = new THREE.DirectionalLight(0xfffaee, 1.5);
        this.sunLight.castShadow = true;
        
        // Add a physical sun sphere (Large and glowing)
        const sunGeo = new THREE.SphereGeometry(4, 32, 32);
        const sunMat = new THREE.MeshBasicMaterial({ 
            color: 0xffea00
        });
        this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
        this.scene.add(this.sunMesh);

        // Shadow map settings
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 150;
        
        const d = 30;
        this.sunLight.shadow.camera.left = -d;
        this.sunLight.shadow.camera.right = d;
        this.sunLight.shadow.camera.top = d;
        this.sunLight.shadow.camera.bottom = -d;
        this.sunLight.shadow.bias = -0.0005;

        this.scene.add(this.sunLight);
        
        this.params = {
            timeOfDay: 12.0,
            dayOfYear: 172,
            latitude: 37.77,
            sunIntensity: 1.5
        };
    }

    updateSunPosition() {
        const time = this.params.timeOfDay;
        const lat = this.params.latitude * Math.PI / 180;
        const declination = 23.45 * Math.sin((2 * Math.PI / 365) * (284 + this.params.dayOfYear)) * Math.PI / 180;
        const hourAngle = (time - 12) * 15 * Math.PI / 180;

        const elevation = Math.asin(Math.sin(lat) * Math.sin(declination) + Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle));
        let azimuth = Math.acos((Math.sin(elevation) * Math.sin(lat) - Math.sin(declination)) / (Math.cos(elevation) * Math.cos(lat)));
        if (time > 12) { azimuth = 2 * Math.PI - azimuth; }

        if (elevation < 0) {
            this.sunLight.intensity = 0;
            this.sunMesh.visible = false;
        } else {
            this.sunLight.intensity = this.params.sunIntensity * Math.sin(elevation);
            
            // Fix: Rotate sun perfectly around the house at (0,0,0)
            const distance = 80; 
            this.sunLight.position.x = distance * Math.cos(elevation) * Math.sin(azimuth);
            this.sunLight.position.y = distance * Math.sin(elevation);
            this.sunLight.position.z = distance * Math.cos(elevation) * Math.cos(azimuth);
            
            this.sunMesh.position.copy(this.sunLight.position);
            this.sunMesh.visible = true;

            this.sunLight.target.position.set(0, 0, 0);
            this.sunLight.target.updateMatrixWorld();
        }
    }
}
