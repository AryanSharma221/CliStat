class SmartBlindController {
    constructor(windows) {
        this.windows = windows; 
    }

    evaluate(forecast, qPredicted, rooms) {
        const commands = [];
        const audience = typeof getActiveAudience === 'function' ? getActiveAudience() : { blindsStrategy: 'balanced' };
        const strategy = audience.blindsStrategy || 'balanced';

        for (const window of this.windows) {
            const room = rooms.find(r => r.id === window.roomId);
            const roomThreats = forecast.filter(t => t.roomId === window.roomId);

            if (strategy === 'aggressive_savings') {
                if (roomThreats.some(t => t.estimatedHeatSpike > 0.3 && t.minutesUntil < 30)) {
                    commands.push({ windowId: window.id, action: 'closed', reason: 'Aggressive: Imminent thermal threat' });
                } else if (roomThreats.some(t => t.estimatedHeatSpike > 0.1 && t.minutesUntil < 45)) {
                    commands.push({ windowId: window.id, action: 'half', reason: 'Aggressive: Moderate threat approaching' });
                } else if (room.tempC < room.targetTempC && !roomThreats.length) {
                    commands.push({ windowId: window.id, action: 'open', reason: 'Passive solar heating beneficial' });
                } else {
                    commands.push({ windowId: window.id, action: window.blindState, reason: 'No change needed' });
                }
            } else if (strategy === 'comfort_priority') {
                if (roomThreats.some(t => t.estimatedHeatSpike > 0.7 && t.minutesUntil < 10)) {
                    commands.push({ windowId: window.id, action: 'closed', reason: 'Comfort: Imminent high-thermal threat' });
                } else if (roomThreats.some(t => t.estimatedHeatSpike > 0.4 && t.minutesUntil < 15)) {
                    commands.push({ windowId: window.id, action: 'half', reason: 'Comfort: Moderate threat approaching' });
                } else {
                    commands.push({ windowId: window.id, action: 'open', reason: 'Comfort: Prefer natural light' });
                }
            } else {
                // balanced
                if (roomThreats.some(t => t.estimatedHeatSpike > 0.5 && t.minutesUntil < 15)) {
                    commands.push({ windowId: window.id, action: 'closed', reason: 'Imminent high-thermal threat' });
                } else if (roomThreats.some(t => t.estimatedHeatSpike > 0.2 && t.minutesUntil < 30)) {
                    commands.push({ windowId: window.id, action: 'half', reason: 'Moderate threat approaching' });
                } else if (room.tempC < room.targetTempC && !roomThreats.length) {
                    commands.push({ windowId: window.id, action: 'open', reason: 'Passive solar heating beneficial' });
                } else {
                    commands.push({ windowId: window.id, action: window.blindState, reason: 'No change needed' });
                }
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
}
