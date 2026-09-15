class BangBangController {
    constructor(threshold = 75, hysteresis = 1.0) {
        this.threshold = threshold;   
        this.hysteresis = hysteresis; 
        this.isOn = false;
    }

    compute(currentTemp) {
        if (!this.isOn && currentTemp > this.threshold) {
            this.isOn = true;
        } else if (this.isOn && currentTemp < this.threshold - this.hysteresis) {
            this.isOn = false;
        }
        return this.isOn ? 100 : 0; 
    }

    reset() { this.isOn = false; }
}\n