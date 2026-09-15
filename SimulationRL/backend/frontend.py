import streamlit as st
import requests
import json
from datetime import datetime

# Configure page
st.set_page_config(page_title="HVAC Predictor", page_icon="🌡️", layout="wide")

st.title("🌡️ Live HVAC Power Predictor")
st.markdown("Predicts HVAC power demand (W) and load (%) using an XGBoost model, real-time OpenWeatherMap data, and local hotspot occupancy.")

# Sidebar for inputs
with st.sidebar:
    st.header("1. Room Settings")
    room_direction = st.selectbox("Room Direction", ["North", "South", "East", "West"])
    room_area = st.number_input("Room Area (m²)", min_value=10.0, max_value=500.0, value=80.0)
    window_area = st.number_input("Window Area (m²)", min_value=0.0, max_value=100.0, value=20.0)
    
    st.header("2. Thermal Goals")
    required_temperature = st.number_input("Required Temperature (°C)", min_value=16.0, max_value=30.0, value=24.0, step=0.5)
    room_temperature = st.number_input("Current Room Temperature (°C)", min_value=10.0, max_value=40.0, value=26.0, step=0.5)
    heating_setpoint = required_temperature - 2.0
    
    st.header("3. System Capacity")
    max_hvac_capacity_kw = st.number_input("Max HVAC Capacity (kW)", min_value=1.0, max_value=20.0, value=5.0, step=0.5)
    max_hvac_capacity_w = max_hvac_capacity_kw * 1000

# Main area
st.markdown("### Click the button to fetch live weather and predict HVAC load")

if st.button("Predict HVAC Demand", type="primary"):
    # Prepare payload
    payload = {
        "room_direction": room_direction,
        "room_area": room_area,
        "window_area": window_area,
        "required_temperature": required_temperature,
        "room_temperature": room_temperature,
        "heating_setpoint": heating_setpoint,
        "timestamp": datetime.now().isoformat(),
        "max_hvac_capacity_w": max_hvac_capacity_w,
        # We don't send weather/occupancy; the backend fetches it live!
        "outside_temperature": 0.0,
        "humidity": 0.0, 
        "wind_speed": 0.0,
        "solar_radiation": 0.0,
        "occupancy": 0
    }
    
    try:
        # Assuming FastAPI is running locally on port 8000
        response = requests.post("http://localhost:8000/predict", json=payload)
        response.raise_for_status()
        data = response.json()
        
        st.success("Prediction successful! Fetched live data from backend APIs.")
        
        # Display Results
        col1, col2 = st.columns(2)
        
        with col1:
            st.header("📊 Prediction Output")
            st.metric(label="HVAC POWER", value=f"{data['predicted_power_kw']:.2f} kW")
            st.metric(label="HVAC LOAD", value=f"{data['hvac_load_percentage']:.1f} %")
            
            st.divider()
            
            # Explanations
            st.subheader("Why this demand?")
            live = data['live_data_used']
            temp_gap = live['outside_temperature'] - room_temperature
            setpoint_gap = room_temperature - required_temperature
            
            st.markdown(f"""
            * **Temperature gap (Outside vs Room):** {temp_gap:.1f} °C
            * **Setpoint error (Room vs Required):** {setpoint_gap:.1f} °C
            * **Occupancy:** {live['occupancy_from_hotspot']} active hotspot devices
            * **Solar impact:** {live['solar_radiation_estimated']:.1f} W/m² hitting {window_area} m² of windows facing {room_direction}
            """)
            
        with col2:
            st.header("📡 Live Sensor Data Used")
            live = data['live_data_used']
            st.info(f"**City:** {live['city']}")
            st.metric("Outside Temperature", f"{live['outside_temperature']:.1f} °C")
            st.metric("Estimated Solar Radiation", f"{live['solar_radiation_estimated']:.1f} W/m²")
            st.metric("Hotspot Connected Devices", f"{live['occupancy_from_hotspot']} devices")
            
    except requests.exceptions.ConnectionError:
        st.error("Could not connect to the backend API. Is FastAPI running on port 8000?")
    except Exception as e:
        st.error(f"Error: {e}")

st.markdown("---")
st.markdown("*Note: Weather is fetched live from OpenWeatherMap. Occupancy is fetched automatically by scanning the active Windows Hotspot connections on the host machine.*")
