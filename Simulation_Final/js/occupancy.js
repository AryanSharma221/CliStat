// js/occupancy.js

// ═══════════════════════════════════════════════════════════════
//  MULTI-SIGNAL OCCUPANCY FUSION ENGINE
//  Fuses 4 independent signals to estimate room occupancy:
//    1. Time-based stochastic prior (Bayesian baseline)
//    2. WiFi device count (phones, laptops, IoT)
//    3. Ambient noise level (dB)
//    4. Active appliances (lights, fans, monitors)
// ═══════════════════════════════════════════════════════════════

class StochasticOccupancyModel {
    constructor() {
        // Signal 1: Time-based probability schedule
        // { hour: { mean occupants, std deviation } }
        this.schedule = {
            0:  { mean: 2, std: 0.5 },   // sleeping
            6:  { mean: 2, std: 0.3 },   // waking up
            7:  { mean: 1.5, std: 0.8 }, // someone might leave early
            8:  { mean: 0.5, std: 0.5 }, // most at work/school
            9:  { mean: 0.2, std: 0.3 },
            12: { mean: 0.5, std: 0.5 }, // lunch break return
            14: { mean: 0.2, std: 0.3 },
            17: { mean: 1.5, std: 0.8 }, // returning home
            18: { mean: 2.5, std: 0.5 }, // dinner
            20: { mean: 2, std: 0.3 },   // evening
            22: { mean: 2, std: 0.3 },   // preparing to sleep
        };

        // Commercial schedule override
        this.commercialSchedule = {
            0:  { mean: 0, std: 0.1 },
            6:  { mean: 0.5, std: 0.3 },
            7:  { mean: 3, std: 1.0 },
            8:  { mean: 12, std: 2.0 },  // morning rush
            9:  { mean: 18, std: 3.0 },  // full office
            10: { mean: 20, std: 2.0 },  // peak
            12: { mean: 10, std: 3.0 },  // lunch exodus
            13: { mean: 15, std: 2.0 },  // returning
            14: { mean: 20, std: 2.0 },  // afternoon peak
            17: { mean: 8, std: 3.0 },   // leaving
            18: { mean: 2, std: 1.0 },   // overtime workers
            20: { mean: 0.5, std: 0.3 }, // security/cleaning
            22: { mean: 0, std: 0.1 },
        };
    }

    // ─────────────────────────────────────────────────
    //  Signal 1: Time-Based Prior (Bayesian Baseline)
    // ─────────────────────────────────────────────────
    getTimePrior(hour, isCommercial = false) {
        const sched = isCommercial ? this.commercialSchedule : this.schedule;
        const entries = Object.entries(sched).map(([h, v]) => [parseInt(h), v]);
        let lower = entries[0], upper = entries[entries.length - 1];
        for (let i = 0; i < entries.length - 1; i++) {
            if (entries[i][0] <= Math.floor(hour) && entries[i+1][0] > Math.floor(hour)) {
                lower = entries[i];
                upper = entries[i+1];
                break;
            }
        }
        const t = (hour - lower[0]) / Math.max(1, upper[0] - lower[0]);
        return Math.max(0, lower[1].mean + t * (upper[1].mean - lower[1].mean));
    }

    // ─────────────────────────────────────────────────
    //  Signal 2: WiFi Device Count
    //  Each person ≈ 2 devices (phone + laptop)
    //  Plus baseline IoT devices (smart speakers, etc.)
    // ─────────────────────────────────────────────────
    simulateWiFiDevices(trueOccupancy, isCommercial = false) {
        const devicesPerPerson = isCommercial ? 2.5 : 2.0; // office = phone+laptop+tablet
        const baselineIoT = isCommercial ? 8 : 3; // smart speakers, printers, etc.
        const noise = (Math.random() - 0.5) * 2; // ±1 device noise
        return Math.max(0, Math.round(trueOccupancy * devicesPerPerson + baselineIoT + noise));
    }

    estimateFromWiFi(deviceCount, isCommercial = false) {
        const devicesPerPerson = isCommercial ? 2.5 : 2.0;
        const baselineIoT = isCommercial ? 8 : 3;
        return Math.max(0, (deviceCount - baselineIoT) / devicesPerPerson);
    }

    // ─────────────────────────────────────────────────
    //  Signal 3: Ambient Noise Level (dB)
    //  Empty room ≈ 30 dB, each person ≈ +5-8 dB
    //  Cooking/printer adds extra noise
    // ─────────────────────────────────────────────────
    simulateNoiseLevel(trueOccupancy, isCommercial = false) {
        const baseNoise = isCommercial ? 35 : 30; // office HVAC hum vs quiet home
        const noisePerPerson = isCommercial ? 5 : 7; // office people talk less than family
        const randomNoise = (Math.random() - 0.5) * 6; // ±3 dB sensor noise
        return Math.max(20, baseNoise + trueOccupancy * noisePerPerson + randomNoise);
    }

    estimateFromNoise(noiseDb, isCommercial = false) {
        const baseNoise = isCommercial ? 35 : 30;
        const noisePerPerson = isCommercial ? 5 : 7;
        return Math.max(0, (noiseDb - baseNoise) / noisePerPerson);
    }

    // ─────────────────────────────────────────────────
    //  Signal 4: Active Appliances (Lights, Fans, Monitors)
    //  Binary/count signals that reduce uncertainty
    // ─────────────────────────────────────────────────
    simulateAppliances(trueOccupancy, hour, isCommercial = false) {
        const isDaytime = hour >= 6 && hour <= 20;
        
        return {
            lightsOn: trueOccupancy > 0 ? Math.min(trueOccupancy + 1, isCommercial ? 12 : 4) : (isDaytime ? 0 : 0),
            fansOn: trueOccupancy > 0 ? Math.ceil(trueOccupancy / (isCommercial ? 4 : 2)) : 0,
            monitorsOn: isCommercial ? Math.min(trueOccupancy, 20) : Math.min(trueOccupancy, 2)
        };
    }

    estimateFromAppliances(appliances, isCommercial = false) {
        // If lights are off and fans are off, very likely empty
        if (appliances.lightsOn === 0 && appliances.fansOn === 0) return 0;
        // Monitors are a strong signal in offices
        if (isCommercial) return appliances.monitorsOn * 0.8;
        // Residential: lights give a rough count
        return Math.max(appliances.lightsOn - 1, 0);
    }

    // ═══════════════════════════════════════════════════
    //  FUSION: Weighted average of all 4 signals
    //  Weights represent confidence in each signal
    // ═══════════════════════════════════════════════════
    fuseOccupancy(hour, wifiDevices, noiseDb, appliances, isCommercial = false) {
        // Individual estimates
        const timePrior    = this.getTimePrior(hour, isCommercial);
        const wifiEstimate = this.estimateFromWiFi(wifiDevices, isCommercial);
        const noiseEstimate = this.estimateFromNoise(noiseDb, isCommercial);
        const appEstimate  = this.estimateFromAppliances(appliances, isCommercial);

        // Confidence weights (how much we trust each signal)
        const weights = {
            time: 0.15,   // lowest — it's just a prior, easily wrong
            wifi: 0.40,   // highest — device count is very reliable
            noise: 0.20,  // moderate — noise is noisy (ironic)
            appliance: 0.25 // good — lights/fans are binary and reliable
        };

        const fusedEstimate = 
            weights.time * timePrior +
            weights.wifi * wifiEstimate +
            weights.noise * noiseEstimate +
            weights.appliance * appEstimate;

        return {
            fused: Math.max(0, Math.round(fusedEstimate * 10) / 10),
            signals: {
                timePrior: Math.round(timePrior * 10) / 10,
                wifiEstimate: Math.round(wifiEstimate * 10) / 10,
                noiseEstimate: Math.round(noiseEstimate * 10) / 10,
                applianceEstimate: Math.round(appEstimate * 10) / 10,
                wifiDevices,
                noiseDb: Math.round(noiseDb),
                lightsOn: appliances.lightsOn,
                fansOn: appliances.fansOn,
                monitorsOn: appliances.monitorsOn
            },
            weights
        };
    }

    // ─────────────────────────────────────────────────
    //  CONVENIENCE: Full pipeline (simulate + fuse)
    //  Used by main.js game loop
    // ─────────────────────────────────────────────────
    getExpectedOccupancy(hour, isCommercial = false) {
        // Simulate "ground truth" from time prior + randomness
        const trueOccupancy = Math.max(0, Math.round(
            this.getTimePrior(hour, isCommercial) + (Math.random() - 0.5) * 2
        ));

        // Generate simulated sensor readings
        const wifiDevices = this.simulateWiFiDevices(trueOccupancy, isCommercial);
        const noiseDb = this.simulateNoiseLevel(trueOccupancy, isCommercial);
        const appliances = this.simulateAppliances(trueOccupancy, hour, isCommercial);

        // Fuse all signals
        const result = this.fuseOccupancy(hour, wifiDevices, noiseDb, appliances, isCommercial);
        result.trueOccupancy = trueOccupancy; // for debug display

        return result;
    }

    getUncertaintyBand(hour, isCommercial = false) {
        const mean = this.getTimePrior(hour, isCommercial);
        const std = isCommercial ? 3.0 : 0.5;
        return { low: Math.max(0, mean - std), high: mean + std };
    }
}
