class AnomalyDetector {
    constructor() {
        this.history = [];
        this.windowSize = 30; 
    }

    check(rooms, weather, hvacState, solarLoad) {
        const alerts = [];
        const state = { rooms: JSON.parse(JSON.stringify(rooms)), hvacState, weather, solarLoad };
        
        this.history.push(state);
        if (this.history.length > this.windowSize) {
            this.history.shift();
        }

        if (this.history.length < this.windowSize) return alerts;

        const oldest = this.history[0];
        
        for (const room of rooms) {
            const oldRoom = oldest.rooms.find(r => r.id === room.id);
            const hvacPower = hvacState[room.id] || 0;
            const tempDiff = room.tempC - oldRoom.tempC;

            if (hvacPower > 50 && tempDiff > 0.5 && weather.outdoorTempC > room.tempC + 3) {
                alerts.push({
                    type: 'WINDOW_OPEN',
                    severity: 'High',
                    message: `Room ${room.id} is losing cooling rapidly.`,
                    suggestion: 'Check for open windows or doors.'
                });
            }

            if (hvacPower === 0 && solarLoad < 0.1 && tempDiff > 1.0) {
                alerts.push({
                    type: 'UNEXPECTED_HEAT',
                    severity: 'Medium',
                    message: `Room ${room.id} heating without solar load.`,
                    suggestion: 'Check for high occupancy or active appliances.'
                });
            }

            if (hvacPower > 80 && tempDiff > -0.1 && weather.outdoorTempC < 32 && solarLoad < 0.5) {
                alerts.push({
                    type: 'HVAC_DEGRADATION',
                    severity: 'High',
                    message: `HVAC in Room ${room.id} is underperforming.`,
                    suggestion: 'Schedule maintenance or check filter.'
                });
            }
        }

        return alerts;
    }
}
