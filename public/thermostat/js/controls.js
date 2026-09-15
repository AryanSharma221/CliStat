function initControls(state, modules) {
    const modeSelect = document.getElementById('mode-select');
    if (modeSelect) {
        modeSelect.addEventListener('change', (e) => {
            state.activeMode = e.target.value;
        });
    }

    const timeSpeed = document.getElementById('time-speed');
    if (timeSpeed) {
        timeSpeed.addEventListener('input', (e) => {
            state.simulationSpeed = parseInt(e.target.value);
        });
    }

    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            resetSimulation();
        });
    }

    const calibrateBtn = document.getElementById('calibrate-btn');
    if (calibrateBtn) {
        calibrateBtn.addEventListener('click', () => {
            if (modules.calibrator.isCalibrating) {
                const result = modules.calibrator.runCalibration();
                console.log('Calibration result:', result);
                alert(`Calibration complete! Run ${result.cycle}.`);
            } else {
                modules.calibrator.startCalibration();
                alert("Calibration started. Please wait while data is collected.");
            }
        });
    }
}