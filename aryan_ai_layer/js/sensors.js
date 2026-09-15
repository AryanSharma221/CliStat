class IoTSensorNetwork {
    constructor(rooms) {
        this.sensors = [];
        let idCounter = 1;
        for (const room of rooms) {
            const positions = [
                { x: room.x + 10, y: room.y + 10, label: 'Near Window' },
                { x: room.x + room.width / 2, y: room.y + room.height / 2, label: 'Center' },
                { x: room.x + room.width - 10, y: room.y + room.height - 10, label: 'Far Corner' },
                { x: room.x + room.width / 2, y: room.y + room.height - 10, label: 'Near Door' }
            ];
            for (const pos of positions) {
                this.sensors.push({
                    id: idCounter++,
                    roomId: room.id,
                    x: pos.x,
                    y: pos.y,
                    label: pos.label,
                    lastReading: null
                });
            }
        }
    }

    readAll(rooms, hvacState, heatmap) {
        for (const sensor of this.sensors) {
            const room = rooms.find(r => r.id === sensor.roomId);
            if (!room) continue;

            let reading = room.tempF;
            
            const noise = (Math.random() + Math.random() + Math.random() + Math.random() + Math.random() + Math.random() - 3) / 3;
            reading += noise * 0.5; 

            if (sensor.label === 'Near Door' && hvacState[room.id] > 0) {
                reading -= (hvacState[room.id] / 100) * 1.5;
            }

            if (heatmap) {
                const cx = Math.floor(sensor.x / heatmap.cellSize);
                const cy = Math.floor(sensor.y / heatmap.cellSize);
                if (cx >= 0 && cx < heatmap.cols && cy >= 0 && cy < heatmap.rows) {
                    const heatVal = heatmap.grid[cy * heatmap.cols + cx];
                    reading += heatVal * 5; 
                }
            }

            sensor.lastReading = reading;
        }
        return this.sensors.map(s => ({ id: s.id, roomId: s.roomId, reading: s.lastReading }));
    }
}
