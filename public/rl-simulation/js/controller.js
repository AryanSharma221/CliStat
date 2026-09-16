class FeedForwardPIDController {
    constructor(Kp, Ki, Kd, Kff) {
        this.Kp = Kp; this.Ki = Ki; this.Kd = Kd; this.Kff = Kff;
        this.integral = 0; this.previousError = 0;
    }
    compute(currentTemp, targetTemp, qPredicted, dt) {
        const error = currentTemp - targetTemp;
        const P = this.Kp * error;
        this.integral += error * dt;
        this.integral = Math.max(-50, Math.min(50, this.integral));
        const I = this.Ki * this.integral;
        const safeDt = Math.max(dt, 0.001);
        const D = this.Kd * ((error - this.previousError) / safeDt);
        this.previousError = error;
        const FF = this.Kff * qPredicted;
        // Expose internals for Algorithm Trace display
        this.lastError = error;
        this.lastP = P; this.lastI = I; this.lastD = D; this.lastFF = FF;
        return Math.max(0, Math.min(100, P + I + D + FF));
    }
    reset() { this.integral = 0; this.previousError = 0; }
}

class ModelPredictiveController {
    constructor(horizonMinutes = 60, stepsPerHorizon = 12) {
        this.horizon = horizonMinutes;
        this.steps = stepsPerHorizon;
    }

    compute(currentTemp, targetTemp, currentHour, rooms, objects, windows, weather, dt) {
        const audience = typeof getActiveAudience === 'function' ? getActiveAudience() : { energyPenaltyWeight: 0.1 };
        const lambda = audience.energyPenaltyWeight || 0.1; 
        
        const stepSize = this.horizon / this.steps; 
        let bestSchedule = [];
        let bestCost = Infinity;

        const candidates = this.generateCandidateSchedules();

        for (const schedule of candidates) {
            let simTemp = currentTemp;
            let cost = 0;

            for (let step = 0; step < this.steps; step++) {
                const futureHour = currentHour + (step * stepSize) / 60;
                
                let futureIntensity = 0;
                let futureHits = [];
                if (typeof getSunAngle === 'function') {
                    const futureAngles = getSunAngle(futureHour, window.dayOfYear || 180, window.latitude || 34);
                    futureIntensity = getSunIntensity(futureHour, weather.cloud);
                    const futureRays = generateSunRays(futureAngles, windows);
                    futureHits = detectAllIntersections(futureRays, objects);
                }

                let futureQ = 0;
                for (const hit of futureHits) {
                    if (hit.isIntersecting) {
                        futureQ += futureIntensity * hit.intersectArea * hit.thermalMass;
                    }
                }

                const hvacPower = schedule[step];
                if (typeof updateRoomTemperature === 'function') {
                    simTemp = updateRoomTemperature(simTemp, futureQ, hvacPower, stepSize * 60);
                } else {
                    simTemp += futureQ * 0.1 - (hvacPower / 100) * 0.5;
                }

                cost += Math.pow(simTemp - targetTemp, 2) + lambda * Math.pow(hvacPower, 2);
            }

            if (cost < bestCost) {
                bestCost = cost;
                bestSchedule = schedule;
            }
        }

        return bestSchedule[0]; 
    }

    generateCandidateSchedules() {
        const schedules = [];
        const powerLevels = [0, 10, 20, 30, 50, 75, 100];
        for (let i = 0; i < 50; i++) {
            const schedule = [];
            for (let s = 0; s < this.steps; s++) {
                schedule.push(powerLevels[Math.floor(Math.random() * powerLevels.length)]);
            }
            schedules.push(schedule);
        }
        schedules.push(new Array(this.steps).fill(0));
        schedules.push(new Array(this.steps).fill(100));
        return schedules;
    }
}

class SelfTuningPID {
    constructor(basePID) {
        this.pid = basePID;
        this.learningRate = 0.001;
        this.costHistory = [];
        this.paramHistory = [];
    }

    runEpoch(simulationFn) {
        const cost = simulationFn(this.pid.Kp, this.pid.Ki, this.pid.Kd, this.pid.Kff);
        this.costHistory.push(cost);
        this.paramHistory.push({ ...this.pid });

        const epsilon = 0.01;
        const params = ['Kp', 'Ki', 'Kd', 'Kff'];

        for (const param of params) {
            const original = this.pid[param];

            this.pid[param] = original + epsilon;
            const costPlus = simulationFn(this.pid.Kp, this.pid.Ki, this.pid.Kd, this.pid.Kff);

            this.pid[param] = original - epsilon;
            const costMinus = simulationFn(this.pid.Kp, this.pid.Ki, this.pid.Kd, this.pid.Kff);

            const gradient = (costPlus - costMinus) / (2 * epsilon);
            this.pid[param] = original - this.learningRate * gradient;
            this.pid[param] = Math.max(0, this.pid[param]);
        }

        return { cost, params: { ...this.pid } };
    }
}

class RLAgent {
    constructor(stateSize = 8, actionCount = 7) {
        this.stateSize = stateSize;
        this.actionCount = actionCount;
        this.actions = [0, 10, 20, 30, 50, 75, 100];
        this.epsilon = 0.3;          
        this.gamma = 0.95;           
        this.learningRate = 0.01;
        this.memory = [];            
        this.maxMemory = 10000;
        this.qTable = {};
    }

    getState(currentTemp, targetTemp, qPredicted, hour, humidity, outdoorTemp, hvacPower, blindState) {
        return [
            Math.round(currentTemp),
            Math.round(targetTemp),
            Math.round(qPredicted * 10) / 10,
            Math.round(hour),
            Math.round(humidity / 10),
            Math.round(outdoorTemp / 5) * 5,
            Math.round(hvacPower / 20) * 20,
            blindState
        ].join(',');
    }

    selectAction(stateKey) {
        if (Math.random() < this.epsilon) {
            return Math.floor(Math.random() * this.actionCount); 
        }
        const qValues = this.qTable[stateKey] || new Array(this.actionCount).fill(0);
        return qValues.indexOf(Math.max(...qValues)); 
    }

    learn(state, action, reward, nextState) {
        if (!this.qTable[state]) this.qTable[state] = new Array(this.actionCount).fill(0);
        if (!this.qTable[nextState]) this.qTable[nextState] = new Array(this.actionCount).fill(0);

        const maxNextQ = Math.max(...this.qTable[nextState]);
        const target = reward + this.gamma * maxNextQ;
        this.qTable[state][action] += this.learningRate * (target - this.qTable[state][action]);
    }

    getReward(currentTemp, targetTemp, hvacPower, comfortScore) {
        const audience = typeof getActiveAudience === 'function' ? getActiveAudience() : { energyPenaltyWeight: 0.1 };
        const lambda = audience.energyPenaltyWeight || 0.1;
        const tempPenalty = -Math.pow(currentTemp - targetTemp, 2);
        const energyPenalty = -lambda * hvacPower;
        const comfortBonus = (Math.abs(comfortScore) < 0.5) ? 5 : 0;
        return tempPenalty + energyPenalty + comfortBonus;
    }
}
