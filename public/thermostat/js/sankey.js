class SankeyDiagram {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if(this.canvas) this.ctx = this.canvas.getContext('2d');
    }

    render(qPredicted, hvacPower, blindsReduction) {
        if(!this.ctx || !qPredicted) return;
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        ctx.clearRect(0, 0, w, h);

        const total = Math.max(0.1, qPredicted.total || 1);
        const sources = [
            { label: 'Solar',     value: qPredicted.solar || 0,     color: '#FFD700' },
            { label: 'Occupancy', value: qPredicted.occupancy || 0, color: '#FF8C00' },
            { label: 'Envelope',  value: Math.max(0, qPredicted.envelope || 0),  color: '#9370DB' },
            { label: 'Humidity',  value: qPredicted.latent || 0,    color: '#4682B4' },
            { label: 'Decay',     value: qPredicted.decay || 0,     color: '#CD853F' }
        ];

        const sinks = [
            { label: 'HVAC Removed',     value: (hvacPower || 0) * 0.05,     color: '#00CED1' },
            { label: 'Blinds Blocked',   value: blindsReduction * (qPredicted.solar || 0), color: '#2E8B57' },
            { label: 'Envelope Loss',    value: Math.max(0, -(qPredicted.envelope || 0)) * 0.5, color: '#708090' },
            { label: 'Retained Heat',    value: Math.max(0, total - ((hvacPower || 0) * 0.05)), color: '#DC143C' }
        ];

        let yOffset = 10;
        for (const src of sources) {
            const height = Math.max(2, (src.value / total) * (h - 20));
            ctx.fillStyle = src.color;
            ctx.globalAlpha = 0.7;
            ctx.fillRect(10, yOffset, 60, height);
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#fff';
            ctx.font = '10px sans-serif';
            ctx.fillText(`${src.label}`, 15, yOffset + height/2 + 4);

            ctx.beginPath();
            ctx.moveTo(70, yOffset + height/2);
            ctx.bezierCurveTo(w/2 - 20, yOffset + height/2, w/2 - 20, h/2, w/2, h/2);
            ctx.strokeStyle = src.color;
            ctx.globalAlpha = 0.3;
            ctx.lineWidth = Math.max(1, height * 0.8);
            ctx.stroke();
            ctx.globalAlpha = 1;

            yOffset += height + 5;
        }

        ctx.fillStyle = '#333';
        ctx.fillRect(w/2 - 20, h/2 - 20, 40, 40);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('Room', w/2 - 15, h/2 + 4);

        yOffset = 10;
        for (const sink of sinks) {
            const height = Math.max(2, (sink.value / total) * (h - 20));
            ctx.fillStyle = sink.color;
            ctx.globalAlpha = 0.7;
            ctx.fillRect(w - 70, yOffset, 60, height);
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#fff';
            ctx.fillText(`${sink.label}`, w - 65, yOffset + height/2 + 4);
            yOffset += height + 5;
        }
    }
}