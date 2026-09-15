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
        
        const D = this.Kd * ((error - this.previousError) / dt);
        this.previousError = error;
        
        // Feed-Forward based on Q-predicted vectors
        const FF = this.Kff * qPredicted;
        
        return Math.max(0, Math.min(100, P + I + D + FF));
    }
    reset() { this.integral = 0; this.previousError = 0; }
}

class ModelPredictiveController {
    constructor(horizonMinutes = 60, stepsPerHorizon = 12) {
        this.horizon = horizonMinutes;
        this.steps = stepsPerHorizon;
    }

    // A deterministic gradient-search / greedy MPC solver
    compute(currentTemp, targetTemp, qTotal, dt) {
        // Lambda balances comfort (keeping error 0) vs energy usage.
        // We set it to strongly prefer comfort but minimize power when near target.
        const lambda = 0.05; 
        
        // Instead of random search, we evaluate 11 discrete power levels deterministically
        // and project one step forward, assuming Q remains relatively stable over this dt.
        const powerLevels = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
        let bestPower = 0;
        let bestCost = Infinity;

        // HVAC capacity from config, or default fallback
        const HVAC_POWER_KW = (typeof CONFIG !== 'undefined' && CONFIG.PHYSICS) ? CONFIG.PHYSICS.HVAC_COOLING_POWER : 5.0;
        const CAPACITANCE = (typeof CONFIG !== 'undefined' && CONFIG.PHYSICS) ? CONFIG.PHYSICS.ROOM_THERMAL_CAPACITANCE : 10000;

        for (const p of powerLevels) {
            // Predict next temperature state
            // Heat gain = Q / Capacitance
            // Heat removal = HVAC_POWER * (p/100) / 60 
            // Simplified 1-step Euler integration
            const heatGain = (qTotal / CAPACITANCE) * dt;
            const heatRemoval = (HVAC_POWER_KW * (p / 100) / 60) * dt;
            
            const nextTemp = currentTemp + heatGain - heatRemoval;
            
            // J = (T - T_set)^2 + lambda * (P)^2
            const cost = Math.pow(nextTemp - targetTemp, 2) + lambda * Math.pow(p / 100, 2);
            
            if (cost < bestCost) {
                bestCost = cost;
                bestPower = p;
            }
        }

        return bestPower;
    }
}

class SelfTuningPID {
    constructor() {
        this.Kp = 1.0; this.Ki = 0.1; this.Kd = 0.05;
        this.learningRate = 0.001;
    }
    compute(currentTemp, targetTemp, dt) {
        // Gradient descent tuning (simplified)
        const error = currentTemp - targetTemp;
        this.Kp -= this.learningRate * error * currentTemp; 
        // ... (placeholder)
        return Math.max(0, Math.min(100, this.Kp * error));
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FeedForwardPIDController, ModelPredictiveController, SelfTuningPID };
}
