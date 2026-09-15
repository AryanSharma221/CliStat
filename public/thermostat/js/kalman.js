class KalmanFilter {
    constructor(processNoise = 0.01, measurementNoise = 0.5) {
        this.x = 72;           
        this.P = 1;            
        this.Q = processNoise; 
        this.R = measurementNoise; 
    }

    predict(controlInput = 0) {
        this.x = this.x + controlInput;
        this.P = this.P + this.Q;
    }

    update(measurement) {
        const K = this.P / (this.P + this.R);
        this.x = this.x + K * (measurement - this.x);
        this.P = (1 - K) * this.P;
        return { estimate: this.x, uncertainty: Math.sqrt(this.P), kalmanGain: K };
    }
}

class MultiSensorFusion {
    constructor(sensorCount) {
        this.sensors = [];
        this.filters = [];
        for (let i = 0; i < sensorCount; i++) {
            this.sensors.push({ id: `sensor_${i}`, noise: 0.3 + Math.random() * 0.7 });
            this.filters.push(new KalmanFilter(0.01, this.sensors[i].noise));
        }
    }

    fuseMeasurements(trueTemp) {
        const readings = [];
        for (let i = 0; i < this.sensors.length; i++) {
            const noise = (Math.random() - 0.5) * 2 * this.sensors[i].noise;
            const rawReading = trueTemp + noise;
            this.filters[i].predict();
            const filtered = this.filters[i].update(rawReading);
            readings.push({
                sensorId: this.sensors[i].id,
                raw: rawReading,
                filtered: filtered.estimate,
                uncertainty: filtered.uncertainty
            });
        }
        let weightedSum = 0, weightSum = 0;
        for (const r of readings) {
            const w = 1 / (r.uncertainty * r.uncertainty);
            weightedSum += r.filtered * w;
            weightSum += w;
        }
        return {
            estimate: weightedSum / weightSum,
            uncertainty: Math.sqrt(1 / weightSum),
            sensorReadings: readings
        };
    }
}\n