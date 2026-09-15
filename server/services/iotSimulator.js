/**
 * IoT Sensor Simulator
 * Emits realistic sensor readings over Socket.IO every 800ms,
 * matching the architecture spec's I2C sampling rate.
 */

// Box-Muller transform for Gaussian noise
function gaussianNoise(mean, stddev) {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stddev;
}

// Realistic daily temperature curve (peaks around 2-3 PM)
function baseTempAtHour(hour) {
  return 72 + 10 * Math.sin(((hour - 6) / 12) * Math.PI);
}

// Occupancy probability by time of day
function occupancyAtHour(hour) {
  if (hour >= 9 && hour <= 17) return 0.7 + Math.random() * 0.3;   // work hours
  if (hour >= 7 && hour < 9)  return 0.3 + Math.random() * 0.3;    // morning arrival
  if (hour >= 17 && hour <= 21) return 0.4 + Math.random() * 0.3;  // evening wind-down
  return Math.random() * 0.1;                                       // night
}

export function startIoTSimulator(socket) {
  let simHour = new Date().getHours() + new Date().getMinutes() / 60;

  const interval = setInterval(() => {
    const baseTemp = baseTempAtHour(simHour);

    // Generate 5 sensor nodes with realistic noise
    const readings = [];
    for (let i = 1; i <= 5; i++) {
      const sensorBias = (i - 3) * 0.6;     // each sensor sits in a slightly different spot
      const noise = gaussianNoise(0, 0.4);   // ±0.4°F std dev sensor noise

      readings.push({
        sensorId: `SENSOR_${i}`,
        tempF: parseFloat((baseTemp + sensorBias + noise).toFixed(2)),
        humidity: parseFloat((45 + Math.random() * 20).toFixed(1)),
        battery: parseFloat((95 - i * 2 + Math.random() * 5).toFixed(0)),
        timestamp: Date.now()
      });
    }

    const occupancy = parseFloat(occupancyAtHour(simHour).toFixed(2));

    socket.emit('sensor_data', {
      readings,
      occupancy,
      simulatedHour: parseFloat(simHour.toFixed(2)),
      timestamp: Date.now()
    });

    // Advance simulated clock (~1 sim-minute per real second)
    simHour = (simHour + 0.014) % 24;
  }, 800);

  // Return cleanup function
  return () => clearInterval(interval);
}
