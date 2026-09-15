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
        const FF = this.Kff * qPredicted;
        return Math.max(0, Math.min(100, P + I + D + FF));
    }
    reset() { this.integral = 0; this.previousError = 0; }
}

class ModelPredictiveController {
    constructor() {}
    compute() { return 50; } 
}
class RLAgent {
    constructor() {}
    compute() { return 50; }
}\n