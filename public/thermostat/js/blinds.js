class SmartBlindController {
    constructor(windows) {
        this.windows = windows;
    }

    evaluate(forecast, qPredicted, rooms) {
        const commands = [];
        for (const window of this.windows) {
            const room = rooms.find(r => r.id === window.roomId);
            const roomThreats = forecast.filter(t => t.roomId === window.roomId);

            if (roomThreats.some(t => t.estimatedHeatSpike > 0.5 && t.minutesUntil < 15)) {
                commands.push({ windowId: window.id, action: 'closed', reason: 'Imminent high-thermal threat' });
            }
            else if (roomThreats.some(t => t.estimatedHeatSpike > 0.2 && t.minutesUntil < 30)) {
                commands.push({ windowId: window.id, action: 'half', reason: 'Moderate threat approaching' });
            }
            else if (room && room.tempF < room.targetTempF && !roomThreats.length) {
                commands.push({ windowId: window.id, action: 'open', reason: 'Passive solar heating beneficial' });
            }
            else {
                commands.push({ windowId: window.id, action: window.blindState, reason: 'No change needed' });
            }
        }
        return commands;
    }

    getHVACReduction(blindCommands) {
        let avoided = 0;
        for (const cmd of blindCommands) {
            if (cmd.action === 'closed') avoided += 0.85; 
            if (cmd.action === 'half') avoided += 0.40;   
        }
        return avoided;
    }
}\n