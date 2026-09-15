function initCharts(modules) {
    const tempCtx = document.getElementById('temp-chart');
    if (tempCtx) {
        modules.tempChart = new Chart(tempCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    { label: 'Predictive Temp (°F)', borderColor: '#00CED1', data: [], tension: 0.3 },
                    { label: 'Standard Temp (°F)', borderColor: '#DC143C', data: [], tension: 0.3 },
                    { label: 'Target', borderColor: '#2ECC71', borderDash: [5, 5], data: [] }
                ]
            },
            options: {
                responsive: true,
                animation: { duration: 0 },
                scales: { y: { title: { display: true, text: '°F' } } }
            }
        });
    }

    const powerCtx = document.getElementById('power-chart');
    if (powerCtx) {
        modules.powerChart = new Chart(powerCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    { label: 'Predictive HVAC (%)', backgroundColor: 'rgba(0,206,209,0.3)', borderColor: '#00CED1', fill: true, data: [] },
                    { label: 'Standard HVAC (%)', backgroundColor: 'rgba(220,20,60,0.3)', borderColor: '#DC143C', fill: true, data: [] }
                ]
            },
            options: {
                responsive: true,
                animation: { duration: 0 },
                scales: { y: { min: 0, max: 100, title: { display: true, text: 'Power %' } } }
            }
        });
    }
}

function updateCharts(modules, history, economics) {
    if(modules.tempChart) {
        modules.tempChart.data.labels = history.timestamps;
        modules.tempChart.data.datasets[0].data = history.predictiveTempF;
        modules.tempChart.data.datasets[1].data = history.standardTempF;
        modules.tempChart.data.datasets[2].data = history.targetTempF;
        modules.tempChart.update();
    }
    if(modules.powerChart) {
        modules.powerChart.data.labels = history.timestamps;
        modules.powerChart.data.datasets[0].data = history.predictivePower;
        modules.powerChart.data.datasets[1].data = history.standardPower;
        modules.powerChart.update();
    }
}