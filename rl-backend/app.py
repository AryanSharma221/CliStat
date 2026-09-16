from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
import subprocess
import requests
import re
import os
from pathlib import Path

app = FastAPI(title="HVAC Power Prediction API")

# Enable CORS so the browser simulation can call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model and features on startup
try:
    MODEL_DIR = Path(__file__).resolve().parent / "model"
    model = joblib.load(MODEL_DIR / "xgboost_hvac.joblib")
    feature_names = joblib.load(MODEL_DIR / "feature_names.joblib")
except Exception as e:
    print(f"Error loading model. Did you run train.py first? {e}")
    model = None
    feature_names = None

# OpenWeatherMap API Key
WEATHER_API_KEY = os.getenv("WEATHER_API_KEY", "f2a535c74ca8328f5e3abe55e599712b")

# ─── Hotspot Occupancy ────────────────────────────────────────────────────────

def get_hotspot_device_count():
    """
    Counts devices connected to the Windows Mobile Hotspot
    by identifying the Wi-Fi Direct Virtual Adapter IP and parsing its ARP block.
    """
    import platform
    if platform.system() != "Windows":
        return 0
    try:
        ipconfig_out = subprocess.check_output("ipconfig /all", shell=True).decode('utf-8', errors='ignore')
        hotspot_ip = None

        adapters = ipconfig_out.split('\r\n\r\n')
        for adapter in adapters:
            if "Microsoft Wi-Fi Direct Virtual Adapter" in adapter:
                match = re.search(r"IPv4 Address[\.\s]+:\s*([\d\.]+)", adapter)
                if match:
                    hotspot_ip = match.group(1)
                    break

        if not hotspot_ip:
            hotspot_ip = "192.168.137.1"

        arp_out = subprocess.check_output("arp -a", shell=True).decode('utf-8', errors='ignore')
        in_hotspot_block = False
        count = 0

        for line in arp_out.split('\n'):
            line = line.strip()
            if line.startswith("Interface:"):
                in_hotspot_block = (hotspot_ip in line)
                continue
            if in_hotspot_block and line and "Internet Address" not in line:
                parts = line.split()
                if len(parts) >= 3:
                    ip = parts[0]
                    if not (ip == hotspot_ip or ip.endswith('.255') or ip.startswith('224.') or ip.startswith('239.') or ip == '255.255.255.255'):
                        count += 1
        return count
    except Exception as e:
        print(f"Error getting hotspot devices: {e}")
        return 0

# ─── Weather API ──────────────────────────────────────────────────────────────

_weather_cache = {"data": None, "timestamp": 0}

def get_live_weather(city="Chennai"):
    """Fetches real weather from OpenWeatherMap. Caches for 60 seconds."""
    import time as _time
    now = _time.time()
    if _weather_cache["data"] and (now - _weather_cache["timestamp"]) < 60:
        return _weather_cache["data"]

    url = f"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={WEATHER_API_KEY}&units=metric"
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()

        temp = data['main']['temp']
        humidity = data['main']['humidity']
        wind_speed = data['wind']['speed']
        cloud_cover = data['clouds']['all']
        condition = data['weather'][0]['main']

        current_time = data['dt']
        sunrise = data['sys']['sunrise']
        sunset = data['sys']['sunset']

        if current_time > sunrise and current_time < sunset:
            solar_radiation = 1000.0 - (cloud_cover * 8.0)
        else:
            solar_radiation = 0.0

        result = {
            "outside_temperature": temp,
            "humidity": humidity,
            "wind_speed": wind_speed,
            "solar_radiation": max(0.0, solar_radiation),
            "cloud_cover": cloud_cover,
            "condition": condition,
            "is_daytime": current_time > sunrise and current_time < sunset
        }
        _weather_cache["data"] = result
        _weather_cache["timestamp"] = now
        return result
    except Exception as e:
        print(f"Weather API error: {e}")
        return None

# ─── API Endpoints ────────────────────────────────────────────────────────────

@app.get("/api/occupancy")
def api_occupancy():
    """Returns the number of devices connected to the Windows Mobile Hotspot."""
    count = get_hotspot_device_count()
    return {"count": count}

@app.get("/api/weather")
def api_weather():
    """Returns live weather data from OpenWeatherMap for Chennai."""
    data = get_live_weather("Chennai")
    if data:
        return data
    raise HTTPException(status_code=502, detail="Could not fetch weather data.")

# ─── Per-Room Prediction ─────────────────────────────────────────────────────

class RoomPredictionInput(BaseModel):
    room_id: str
    room_direction: str
    room_area: float
    window_area: float

class PredictionRequest(BaseModel):
    rooms: List[RoomPredictionInput]
    required_temperature: float
    room_temperature: float     # outdoor temp from API used as proxy
    heating_setpoint: float
    timestamp: str
    # Optional overrides (API values used if available)
    city: str = "Chennai"
    occupancy: int = 0
    outside_temperature: float = 35.0
    humidity: float = 60.0
    wind_speed: float = 3.0
    solar_radiation: float = 800.0
    max_hvac_capacity_w: float = 5000.0

@app.post("/predict")
def predict_hvac_power(request: PredictionRequest):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded.")

    try:
        # 1. Fetch live data
        live_occupancy = get_hotspot_device_count()
        occupancy_to_use = live_occupancy if live_occupancy > 0 else request.occupancy

        weather_data = get_live_weather(request.city)
        if weather_data:
            outside_temp = weather_data['outside_temperature']
            humidity = weather_data['humidity']
            wind_speed = weather_data['wind_speed']
            solar_rad = weather_data['solar_radiation']
        else:
            outside_temp = request.outside_temperature
            humidity = request.humidity
            wind_speed = request.wind_speed
            solar_rad = request.solar_radiation

        # Use outdoor temp as room temperature proxy
        room_temp = outside_temp

        dt = datetime.fromisoformat(request.timestamp)
        hour = dt.hour + dt.minute / 60.0

        # 2. Predict per room
        per_room_results = {}
        total_power_w = 0.0

        for room in request.rooms:
            features = {}
            features['hour_sin'] = np.sin(2 * np.pi * hour / 24)
            features['hour_cos'] = np.cos(2 * np.pi * hour / 24)
            features['month_sin'] = np.sin(2 * np.pi * dt.month / 12)
            features['month_cos'] = np.cos(2 * np.pi * dt.month / 12)
            features['day_of_week'] = dt.weekday()

            features['outside_temperature'] = outside_temp
            features['humidity'] = humidity
            features['wind_speed'] = wind_speed
            features['solar_radiation'] = solar_rad

            features['room_temperature'] = room_temp
            features['required_temperature'] = request.required_temperature
            features['heating_setpoint'] = request.heating_setpoint
            features['temperature_difference'] = outside_temp - room_temp
            features['setpoint_error'] = room_temp - request.required_temperature

            features['occupancy'] = occupancy_to_use
            features['room_area'] = room.room_area
            features['window_area'] = room.window_area

            features['dir_North'] = 1 if room.room_direction.lower() == 'north' else 0
            features['dir_South'] = 1 if room.room_direction.lower() == 'south' else 0
            features['dir_East'] = 1 if room.room_direction.lower() == 'east' else 0
            features['dir_West'] = 1 if room.room_direction.lower() == 'west' else 0

            df = pd.DataFrame([features])[feature_names]
            predicted_w = max(0.0, float(model.predict(df)[0]))
            
            # --- strictly fix how the hvac values that come out of the model ---
            temp_diff = abs(request.required_temperature - request.room_temperature)
            if temp_diff > 0.5:
                # Add 500W of power demand per degree of deviation
                predicted_w += (temp_diff * 500.0)
                
            # Ensure we don't exceed max capacity
            predicted_w = min(predicted_w, request.max_hvac_capacity_w)
            # ---------------------------------------------------------------------

            load_pct = (predicted_w / request.max_hvac_capacity_w) * 100.0

            per_room_results[room.room_id] = {
                "predicted_power_w": round(predicted_w, 2),
                "predicted_power_kw": round(predicted_w / 1000.0, 2),
                "hvac_load_percentage": round(load_pct, 1),
                "room_direction": room.room_direction,
                "room_area": room.room_area,
                "window_area": room.window_area
            }
            total_power_w += predicted_w

        avg_power_w = total_power_w / max(len(request.rooms), 1)
        avg_load_pct = (avg_power_w / request.max_hvac_capacity_w) * 100.0

        return {
            "per_room": per_room_results,
            "total_power_w": round(total_power_w, 2),
            "total_power_kw": round(total_power_w / 1000.0, 2),
            "avg_power_w": round(avg_power_w, 2),
            "avg_load_percentage": round(avg_load_pct, 1),
            "max_capacity_w": request.max_hvac_capacity_w,
            "live_data": {
                "occupancy_from_hotspot": live_occupancy,
                "weather_api_ok": weather_data is not None,
                "city": request.city,
                "outside_temperature": outside_temp,
                "humidity": humidity,
                "solar_radiation": solar_rad,
                "wind_speed": wind_speed
            }
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
