# HVAC Power Prediction System

This project implements an MVP for predicting HVAC power demand and load percentage based on weather, thermal, and occupancy data, using an XGBoost Regressor.

## Architecture

1.  **Machine Learning:** XGBoost predicting HVAC Power (W).
2.  **Backend:** FastAPI providing a `/predict` endpoint.
3.  **Frontend:** Streamlit providing a user interface for demonstrations.

## Prerequisites

Install the required Python packages:

```bash
pip install -r requirements.txt
```

## Running the Project

### 1. Train the Model

First, generate the synthetic training data and train the XGBoost model. This will create a `model` directory containing the saved model and feature list.

```bash
python train.py
```

### 2. Start the Backend API

Run the FastAPI backend server using Uvicorn. This will start the API on `http://localhost:8000`.

```bash
python app.py
```
*(Alternatively, you can run `uvicorn app:app --reload` during development).*

### 3. Start the Frontend Dashboard

In a new terminal window, start the Streamlit frontend. This will open the dashboard in your web browser.

```bash
streamlit run frontend.py
```

## Demo Guide

Once the frontend is running, you can demonstrate the model's responsiveness:
*   **Demo 1 (Occupancy):** Change "People" from 5 to 18 and observe the HVAC load increase.
*   **Demo 2 (Window Area):** Change "Window Area" and see how it impacts the prediction.
*   **Demo 3 (Desired Temp):** Lower the "Required Temperature" and watch the cooling demand rise.
*   **Demo 4 (Weather):** Adjust "Outside Temperature" or "Solar Radiation" to simulate different weather conditions.
