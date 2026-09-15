class IoTSensorNetwork {
    constructor(count) {
        this.sensors = Array(count).fill(0).map((_, i) => ({
            id: `s_${i}`, x: 100 + i*50, y: 100 + i*50, noiseLevel: 0.5, label: `S${i}`
        }));
    }
    readAll(rooms, heatmap, hvacPowerPerRoom) {
        return this.sensors.map(s => {
            const baseTemp = rooms[0].tempF;
            const noise = (Math.random() - 0.5) * s.noiseLevel;
            return { sensorId: s.id, rawReading: baseTemp + noise, x: s.x, y: s.y };
        });
    }
}\n