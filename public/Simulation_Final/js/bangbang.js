class BangBangController {
    constructor(hysteresis = 0.5) {
        this.hysteresis = hysteresis;
        this.mode = 0;
    }

    compute(currentTemp, targetTemp) {
        if (currentTemp > targetTemp + this.hysteresis) {
            this.mode = 100;
        } else if (currentTemp < targetTemp - this.hysteresis) {
            this.mode = -100;
        } else if (this.mode === 100 && currentTemp <= targetTemp) {
            this.mode = 0;
        } else if (this.mode === -100 && currentTemp >= targetTemp) {
            this.mode = 0;
        }
        return this.mode;
    }
}
