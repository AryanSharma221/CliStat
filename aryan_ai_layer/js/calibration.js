class DigitalTwinCalibrator {
    constructor() {
        this.isCalibrating = false;
        this.observations = [];
        this.minObservations = 50;
    }

    startCalibration() {
        this.isCalibrating = true;
        this.observations = [];
    }

    recordObservation(predictedTemp, actualTemp, intersections) {
        if (!this.isCalibrating) return;
        this.observations.push({
            predictedTemp,
            actualTemp,
            intersections: JSON.parse(JSON.stringify(intersections))
        });
    }

    runCalibration(objects) {
        if (this.observations.length < this.minObservations) {
            return { status: 'pending', message: `Need ${this.minObservations - this.observations.length} more observations.` };
        }
        
        let errorSum = 0;
        let objectHits = {};
        
        for (const obj of objects) {
            objectHits[obj.id] = { hitCount: 0, errorAcc: 0 };
        }

        for (const obs of this.observations) {
            const error = obs.predictedTemp - obs.actualTemp; 
            errorSum += Math.abs(error);

            for (const inter of obs.intersections) {
                if (inter.isIntersecting && objectHits[inter.objectId]) {
                    objectHits[inter.objectId].hitCount++;
                    objectHits[inter.objectId].errorAcc += error;
                }
            }
        }

        for (const obj of objects) {
            const stats = objectHits[obj.id];
            if (stats.hitCount > 10) {
                const avgError = stats.errorAcc / stats.hitCount;
                const adjustment = avgError * 0.05; 
                obj.thermalMass = Math.max(0.1, obj.thermalMass - adjustment);
            }
        }

        this.isCalibrating = false;
        return { status: 'success', message: 'Thermal mass recalibrated based on observations.' };
    }
}
