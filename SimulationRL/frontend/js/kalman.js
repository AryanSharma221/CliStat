class KalmanFilter {
    constructor(q = 0.02, r = 0.5, p = 1.0, initialValue = 72.0) {
        this.q = q; 
        this.r = r; 
        this.x = initialValue; 
        this.p = p; 
    }

    update(measurement) {
        this.p = this.p + this.q;
        const k = this.p / (this.p + this.r);
        this.x = this.x + k * (measurement - this.x);
        this.p = (1 - k) * this.p;
        this.p = Math.min(10, this.p);
        return this.x;
    }
}

class MultiSensorFusion {
    constructor(sensors) {
        this.filters = {};
        for (const sensor of sensors) {
            this.filters[sensor.id] = new KalmanFilter(0.02, 0.5 + Math.random()*0.2, 1.0, 72.0);
        }
    }

    fuseMeasurements(sensorReadings) {
        const roomEstimates = {};
        const roomVariances = {};

        for (const reading of sensorReadings) {
            const filter = this.filters[reading.id];
            if (filter) {
                const estimate = filter.update(reading.reading);
                
                if (!roomEstimates[reading.roomId]) {
                    roomEstimates[reading.roomId] = 0;
                    roomVariances[reading.roomId] = 0;
                }

                const weight = 1 / filter.p;
                roomEstimates[reading.roomId] += estimate * weight;
                roomVariances[reading.roomId] += weight;
            }
        }

        const fused = {};
        for (const roomId in roomEstimates) {
            fused[roomId] = {
                estimate: roomEstimates[roomId] / roomVariances[roomId],
                variance: 1 / roomVariances[roomId]
            };
        }

        return fused;
    }
}
