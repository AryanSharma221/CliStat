class EconomicsTracker {
    constructor() {
        this.rates = [
            { start: 0,  end: 6,  rate: 0.05, label: 'Super Off-Peak' },
            { start: 6,  end: 14, rate: 0.08, label: 'Off-Peak' },
            { start: 14, end: 18, rate: 0.22, label: 'Peak' },
            { start: 18, end: 22, rate: 0.10, label: 'Mid-Peak' },
            { start: 22, end: 24, rate: 0.05, label: 'Super Off-Peak' }
        ];

        this.carbonIntensity = [
            { start: 0,  end: 6,  intensity: 0.30 },
            { start: 6,  end: 10, intensity: 0.45 },
            { start: 10, end: 14, intensity: 0.40 },
            { start: 14, end: 18, intensity: 0.55 },
            { start: 18, end: 22, intensity: 0.42 },
            { start: 22, end: 24, intensity: 0.30 }
        ];

        this.predictiveCost = 0;
        this.standardCost = 0;
        this.predictiveCarbon = 0;
        this.standardCarbon = 0;
    }

    getRate(hour) {
        return this.rates.find(r => hour >= r.start && hour < r.end)?.rate || 0.08;
    }

    getCarbon(hour) {
        return this.carbonIntensity.find(r => hour >= r.start && hour < r.end)?.intensity || 0.40;
    }

    update(hour, predictivePower, standardPower, dt) {
        const rate = this.getRate(hour);
        const carbon = this.getCarbon(hour);
        const dtHours = dt / 3600;

        const acCapacityKW = 3.5;
        const predKWh = (predictivePower / 100) * acCapacityKW * dtHours;
        const stdKWh  = (standardPower / 100) * acCapacityKW * dtHours;

        this.predictiveCost   += predKWh * rate;
        this.standardCost     += stdKWh * rate;
        this.predictiveCarbon += predKWh * carbon;
        this.standardCarbon   += stdKWh * carbon;
    }

    getSavings() {
        const costSaved = this.standardCost - this.predictiveCost;
        const carbonSaved = this.standardCarbon - this.predictiveCarbon;
        const costPercent = this.standardCost > 0 ? (costSaved / this.standardCost) * 100 : 0;
        const carbonPercent = this.standardCarbon > 0 ? (carbonSaved / this.standardCarbon) * 100 : 0;

        return {
            costSaved:      costSaved.toFixed(2),
            costPercent:    costPercent.toFixed(1),
            carbonSavedKg:  carbonSaved.toFixed(2),
            carbonPercent:  carbonPercent.toFixed(1),
            predictiveCost: this.predictiveCost.toFixed(2),
            standardCost:   this.standardCost.toFixed(2),
            annualProjection: (costSaved * 365).toFixed(0),
            treesEquivalent: (carbonSaved * 365 / 21).toFixed(1)
        };
    }

    reset() {
        this.predictiveCost = 0; this.standardCost = 0;
        this.predictiveCarbon = 0; this.standardCarbon = 0;
    }
}