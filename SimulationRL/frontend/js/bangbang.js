class BangBangController {
    constructor(hysteresis = 0.5) {
        this.hysteresis = hysteresis;
        this.isOn = false;
    }

    compute(currentTemp, targetTemp) {
        if (currentTemp > targetTemp + this.hysteresis) {
            this.isOn = true;
        } else if (currentTemp <= targetTemp - this.hysteresis) {
            this.isOn = false;
        }
        return this.isOn ? 100 : 0;
    }
}
