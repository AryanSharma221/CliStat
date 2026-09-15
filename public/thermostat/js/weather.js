async function fetchWeather(lat, lon) {
    try {
        const latitude = lat || 37.7749;
        const longitude = lon || -122.4194;
        const res = await fetch(`/api/weather/current?lat=${latitude}&lon=${longitude}`);
        if (!res.ok) throw new Error(`Weather API returned ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn('[Weather] Backend unavailable, using fallback:', err.message);
        return {
            outdoorTempC: 35,
            outdoorTempF: 95,
            humidity: 60,
            cloud: 20,
            feelsLikeF: 98,
            description: 'Sunny (offline)'
        };
    }
}

async function fetchForecast(lat, lon) {
    try {
        const latitude = lat || 37.7749;
        const longitude = lon || -122.4194;
        const res = await fetch(`/api/weather/forecast?lat=${latitude}&lon=${longitude}`);
        if (!res.ok) throw new Error(`Forecast API returned ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn('[Weather] Forecast unavailable:', err.message);
        return [];
    }
}