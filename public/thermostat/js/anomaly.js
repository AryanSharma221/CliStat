class AnomalyDetector {
    constructor(windowSize = 60) {
        this.expectedTemps = [];
        this.actualTemps = [];
        this.windowSize = windowSize;
        this.threshold = 2.0; 
        this.alerts = [];
    }

    check(expectedTemp, actualTemp, hvacPower, qPredicted, weather) {
        this.expectedTemps.push(expectedTemp);
        this.actualTemps.push(actualTemp);
        if (this.expectedTemps.length < 10) return null;
        if (this.expectedTemps.length > this.windowSize) {
            this.expectedTemps.shift();
            this.actualTemps.shift();
        }

        const deviation = actualTemp - expectedTemp;
        const avgDeviation = this.getRunningAverage();
        let alert = null;

        if (avgDeviation < -this.threshold && weather.outdoorTempF < actualTemp) {
            alert = { type: 'WINDOW_OPEN', severity: 'WARNING', message: `Room cooling ${Math.abs(avgDeviation).toFixed(1)}°F faster than predicted.` };
        }
        else if (avgDeviation > this.threshold && qPredicted.solar < 0.1) {
            alert = { type: 'UNEXPECTED_HEAT', severity: 'INFO', message: `Room ${avgDeviation.toFixed(1)}°F warmer than predicted with no solar load.` };
        }
        else if (hvacPower > 50 && avgDeviation > this.threshold) {
            alert = { type: 'HVAC_DEGRADATION', severity: 'CRITICAL', message: `HVAC at ${hvacPower}% power but room is ${avgDeviation.toFixed(1)}°F warmer than expected.` };
        }

        if (alert) this.alerts.push({ ...alert, timestamp: Date.now() });
        return alert;
    }

    getRunningAverage() {
        const recent = this.actualTemps.slice(-10);
        const recentExpected = this.expectedTemps.slice(-10);
        let sum = 0;
        for (let i = 0; i < recent.length; i++) sum += recent[i] - recentExpected[i];
        return sum / recent.length;
    }
}\n