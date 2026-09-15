from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np
from datetime import datetime

app = FastAPI(title="HVAC Power Prediction API")

# Load model and features on startup
try:
    model = joblib.load('model/xgboost_hvac.joblib')
    feature_names = joblib.load('model/feature_names.joblib')
except Exception as e:
    print(f"Error loading model. Did you run train.py first? {e}")
    model = None
    feature_names = None

import subprocess
import requests

# OpenWeatherMap API Key
WEATHER_API_KEY = "f2a535c74ca8328f5e3abe55e599712b"

import re

def get_hotspot_device_count():
    """
    Calculates exact number of devices connected to the Windows Mobile Hotspot 
    by identifying the Virtual Adapter IP and parsing its specific ARP block.
    """
    try:
        # 1. Find the Hotspot Interface IP
        ipconfig_out = subprocess.check_output("ipconfig /all", shell=True).decode('utf-8', errors='ignore')
        hotspot_ip = None
        
        adapters = ipconfig_out.split('\r\n\r\n')
        for adapter in adapters:
            if "Microsoft Wi-Fi Direct Virtual Adapter" in adapter:
                match = re.search(r"IPv4 Address[\.\s]+:\s*([\d\.]+)", adapter)
                if match:
                    hotspot_ip = match.group(1)
                    break
                    
        # Fallback to standard Windows hotspot subnet if not found by exact name
        if not hotspot_ip:
            hotspot_ip = "192.168.137.1"
            
        # 2. Parse ARP table for that specific interface
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
                    # Exclude the router IP, broadcast, and multicast IPs
                    if not (ip == hotspot_ip or ip.endswith('.255') or ip.startswith('224.') or ip.startswith('239.') or ip == '255.255.255.255'):
                        count += 1
                        
        return count
    except Exception as e:
        print(f"Error getting precise hotspot devices: {e}")
        return 0

def get_live_weather(city="Chennai"):
    """
    Fetches real weather from OpenWeatherMap using the provided API key.
    """
    url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={WEATHER_API_KEY}&units=metric"
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        # Extract required fields
        temp = data['main']['temp']
        humidity = data['main']['humidity']
        wind_speed = data['wind']['speed']
        
        # OWM free tier doesn't provide solar radiation, so we estimate based on clouds and time
        cloud_cover = data['clouds']['all'] # 0 to 100%
        
        current_time = data['dt']
        sunrise = data['sys']['sunrise']
        sunset = data['sys']['sunset']
        
        if current_time > sunrise and current_time < sunset:
            # It's daytime: Rough estimation (clear sky = 1000 W/m2, overcast = 200 W/m2)
            solar_radiation = 1000.0 - (cloud_cover * 8.0) 
        else:
            # It's nighttime: Solar radiation is 0
            solar_radiation = 0.0
            
        return {
            "outside_temperature": temp,
            "humidity": humidity,
            "wind_speed": wind_speed,
            "solar_radiation": max(0.0, solar_radiation)
        }
    except Exception as e:
        print(f"Weather API error: {e}")
        return None

class PredictionRequest(BaseModel):
    # Room inputs
    room_direction: str # North, South, East, West
    room_area: float
    window_area: float
    required_temperature: float
    room_temperature: float
    heating_setpoint: float
    
    # Weather/Time inputs (usually from an API in real app)
    timestamp: str # ISO format string e.g., "2023-08-15T14:30:00"
    
    # Optional inputs (will be overridden if live API is successful)
    city: str = "Chennai"
    occupancy: int = 0
    outside_temperature: float = 35.0
    humidity: float = 60.0
    wind_speed: float = 3.0
    solar_radiation: float = 800.0
    
    # System config
    max_hvac_capacity_w: float = 5000.0

@app.post("/predict")
def predict_hvac_power(request: PredictionRequest):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded.")
        
    try:
        # --- 1. Fetch Live API Data ---
        # Get Occupancy from Windows Hotspot
        live_occupancy = get_hotspot_device_count()
        occupancy_to_use = live_occupancy if live_occupancy > 0 else request.occupancy
        
        # Get Live Weather
        weather_data = get_live_weather(request.city)
        if weather_data:
            outside_temp_to_use = weather_data['outside_temperature']
            humidity_to_use = weather_data['humidity']
            wind_speed_to_use = weather_data['wind_speed']
            solar_rad_to_use = weather_data['solar_radiation']
        else:
            outside_temp_to_use = request.outside_temperature
            humidity_to_use = request.humidity
            wind_speed_to_use = request.wind_speed
            solar_rad_to_use = request.solar_radiation

        # Parse timestamp
        dt = datetime.fromisoformat(request.timestamp)
        hour = dt.hour + dt.minute / 60.0
        
        # --- 2. Feature Engineering ---
        features = {}
        
        # Time features
        features['hour_sin'] = np.sin(2 * np.pi * hour / 24)
        features['hour_cos'] = np.cos(2 * np.pi * hour / 24)
        features['month_sin'] = np.sin(2 * np.pi * dt.month / 12)
        features['month_cos'] = np.cos(2 * np.pi * dt.month / 12)
        features['day_of_week'] = dt.weekday()
        
        # Weather
        features['outside_temperature'] = outside_temp_to_use
        features['humidity'] = humidity_to_use
        features['wind_speed'] = wind_speed_to_use
        features['solar_radiation'] = solar_rad_to_use
        
        # Thermal
        features['room_temperature'] = request.room_temperature
        features['required_temperature'] = request.required_temperature
        features['heating_setpoint'] = request.heating_setpoint
        features['temperature_difference'] = outside_temp_to_use - request.room_temperature
        features['setpoint_error'] = request.room_temperature - request.required_temperature
        
        # Occupancy & Room
        features['occupancy'] = occupancy_to_use
        features['room_area'] = request.room_area
        features['window_area'] = request.window_area
        
        # Direction One-Hot
        features['dir_North'] = 1 if request.room_direction.lower() == 'north' else 0
        features['dir_South'] = 1 if request.room_direction.lower() == 'south' else 0
        features['dir_East'] = 1 if request.room_direction.lower() == 'east' else 0
        features['dir_West'] = 1 if request.room_direction.lower() == 'west' else 0
        
        # --- 3. Build DataFrame in correct order ---
        df = pd.DataFrame([features])[feature_names]
        
        # --- 4. Predict ---
        predicted_power_w = float(model.predict(df)[0])
        predicted_power_w = max(0.0, predicted_power_w) # No negative power
        
        # --- 5. Calculate Load % ---
        load_percentage = (predicted_power_w / request.max_hvac_capacity_w) * 100.0
        
        return {
            "predicted_power_w": round(predicted_power_w, 2),
            "predicted_power_kw": round(predicted_power_w / 1000.0, 2),
            "hvac_load_percentage": round(load_percentage, 1),
            "max_capacity_w": request.max_hvac_capacity_w,
            "live_data_used": {
                "occupancy_from_hotspot": live_occupancy,
                "weather_api_successful": weather_data is not None,
                "city": request.city,
                "outside_temperature": outside_temp_to_use,
                "solar_radiation_estimated": solar_rad_to_use
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
