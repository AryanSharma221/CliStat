import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib
import os

def generate_synthetic_data(num_samples=10000):
    print("Generating synthetic 15-minute resolution data...")
    # Generate dates
    start_date = pd.to_datetime('2023-01-01')
    dates = pd.date_range(start_date, periods=num_samples, freq='15min')
    
    # Base variations
    hour_of_day = dates.hour + dates.minute / 60.0
    day_of_year = dates.dayofyear
    
    # Synthetic weather (simplified seasonal/diurnal patterns)
    temp_season = 20 - 15 * np.cos(2 * np.pi * day_of_year / 365)
    temp_diurnal = 5 * np.sin(2 * np.pi * (hour_of_day - 6) / 24)
    outside_temperature = temp_season + temp_diurnal + np.random.normal(0, 2, num_samples)
    
    solar_radiation = np.where((hour_of_day > 6) & (hour_of_day < 18), 
                               800 * np.sin(np.pi * (hour_of_day - 6) / 12), 0) + np.random.normal(0, 50, num_samples)
    solar_radiation = np.clip(solar_radiation, 0, None)
    
    humidity = np.clip(60 - 10 * np.sin(2 * np.pi * (hour_of_day - 6) / 24) + np.random.normal(0, 5, num_samples), 0, 100)
    wind_speed = np.abs(np.random.normal(3, 2, num_samples))
    
    # Synthetic room/thermal parameters
    room_temperature = np.clip(outside_temperature * 0.2 + 20 + np.random.normal(0, 1, num_samples), 16, 30)
    required_temperature = np.random.choice([22, 23, 24, 25], num_samples)
    heating_setpoint = required_temperature - 2
    
    # Synthetic augmented features
    directions = ['North', 'South', 'East', 'West']
    room_direction = np.random.choice(directions, num_samples)
    room_area = np.random.uniform(20, 150, num_samples)
    window_area = room_area * np.random.uniform(0.1, 0.4, num_samples)
    
    # Occupancy pattern
    occupancy = np.zeros(num_samples)
    for i, t in enumerate(dates):
        if t.weekday() < 5:  # Weekday
            if 8 <= t.hour < 9: occupancy[i] = np.random.randint(1, 5)
            elif 9 <= t.hour < 12: occupancy[i] = np.random.randint(5, 20)
            elif 12 <= t.hour < 13: occupancy[i] = np.random.randint(2, 10)
            elif 13 <= t.hour < 18: occupancy[i] = np.random.randint(5, 20)
            elif 18 <= t.hour < 20: occupancy[i] = np.random.randint(0, 5)
    occupancy = occupancy * (room_area / 100) # Scale roughly by room size
    
    # Synthetic HVAC Power Demand (W)
    # Higher difference, more people, more sun (if south/west) -> more power
    temp_diff_penalty = np.abs(outside_temperature - required_temperature) * 100
    setpoint_error_penalty = np.abs(room_temperature - required_temperature) * 200
    solar_penalty = solar_radiation * (window_area/20) * np.where((room_direction == 'South') | ((room_direction == 'West') & (hour_of_day > 12)), 1.5, 0.5)
    occ_penalty = occupancy * 50
    
    hvac_power = temp_diff_penalty + setpoint_error_penalty + solar_penalty + occ_penalty + np.random.normal(0, 100, num_samples)
    hvac_power = np.clip(hvac_power, 0, 10000) # Max 10kW
    
    df = pd.DataFrame({
        'time': dates,
        'outside_temperature': outside_temperature,
        'room_temperature': room_temperature,
        'required_temperature': required_temperature,
        'heating_setpoint': heating_setpoint,
        'humidity': humidity,
        'wind_speed': wind_speed,
        'solar_radiation': solar_radiation,
        'room_direction': room_direction,
        'room_area': room_area,
        'window_area': window_area,
        'occupancy': occupancy,
        'hvac_power': hvac_power
    })
    return df

def feature_engineering(df):
    print("Engineering features...")
    df = df.copy()
    
    # Time features
    df['hour'] = df['time'].dt.hour + df['time'].dt.minute / 60.0
    df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
    df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
    df['month'] = df['time'].dt.month
    df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
    df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
    df['day_of_week'] = df['time'].dt.dayofweek
    
    # Thermal features
    df['temperature_difference'] = df['outside_temperature'] - df['room_temperature']
    df['setpoint_error'] = df['room_temperature'] - df['required_temperature']
    
    # One-hot encode room direction
    df = pd.get_dummies(df, columns=['room_direction'], prefix='dir', drop_first=False)
    
    # Ensure all 4 directions exist in case of small datasets
    for d in ['dir_North', 'dir_South', 'dir_East', 'dir_West']:
        if d not in df.columns:
            df[d] = 0
            
    # Convert booleans from get_dummies to int
    for d in ['dir_North', 'dir_South', 'dir_East', 'dir_West']:
        df[d] = df[d].astype(int)
    
    # Select final features
    features = [
        'hour_sin', 'hour_cos', 'month_sin', 'month_cos', 'day_of_week',
        'outside_temperature', 'humidity', 'wind_speed', 'solar_radiation',
        'room_temperature', 'required_temperature', 'heating_setpoint',
        'temperature_difference', 'setpoint_error',
        'occupancy', 'room_area', 'window_area',
        'dir_North', 'dir_South', 'dir_East', 'dir_West'
    ]
    
    return df[features], df['hvac_power']

def train_model():
    # 1. Get Data
    df_raw = generate_synthetic_data(num_samples=35000) # About 1 year of 15-min data
    
    # 2. Engineer Features
    X, y = feature_engineering(df_raw)
    
    # 3. Chronological Split (70/15/15)
    n = len(df_raw)
    train_end = int(n * 0.7)
    val_end = int(n * 0.85)
    
    X_train, y_train = X.iloc[:train_end], y.iloc[:train_end]
    X_val, y_val = X.iloc[train_end:val_end], y.iloc[train_end:val_end]
    X_test, y_test = X.iloc[val_end:], y.iloc[val_end:]
    
    print(f"Data split: Train={len(X_train)}, Val={len(X_val)}, Test={len(X_test)}")
    
    # 4. Train XGBoost
    print("Training XGBoost Regressor...")
    model = xgb.XGBRegressor(
        n_estimators=100,
        learning_rate=0.1,
        max_depth=6,
        random_state=42,
        objective='reg:squarederror'
    )
    
    model.fit(
        X_train, y_train,
        eval_set=[(X_train, y_train), (X_val, y_val)],
        verbose=10
    )
    
    # 5. Evaluate
    print("\nEvaluating on Test Set...")
    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    rmse = np.sqrt(mean_squared_error(y_test, preds))
    r2 = r2_score(y_test, preds)
    
    print(f"MAE:  {mae:.2f} W")
    print(f"RMSE: {rmse:.2f} W")
    print(f"R²:   {r2:.4f}")
    
    # 6. Save Model
    os.makedirs('model', exist_ok=True)
    joblib.dump(model, 'model/xgboost_hvac.joblib')
    # Save the feature list for the backend
    joblib.dump(X.columns.tolist(), 'model/feature_names.joblib')
    print("Model saved to model/xgboost_hvac.joblib")

if __name__ == '__main__':
    train_model()
