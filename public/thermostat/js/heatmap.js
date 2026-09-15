class ThermalHeatmap {
    constructor(width, height, cellSize = 5) {
        this.cols = Math.ceil(width / cellSize);
        this.rows = Math.ceil(height / cellSize);
        this.cellSize = cellSize;
        this.grid = new Float32Array(this.cols * this.rows).fill(0);
        this.diffusionRate = 0.1;
        this.decayRate = 0.005;
    }

    injectHeat(objects, intersections) {
        for (const inter of intersections) {
            if (!inter.isIntersecting) continue;
            const obj = objects.find(o => o.id === inter.objectId);
            if(!obj || !obj.bbox) continue;
            const cx1 = Math.floor(obj.bbox.x / this.cellSize);
            const cy1 = Math.floor(obj.bbox.y / this.cellSize);
            const cx2 = Math.floor((obj.bbox.x + obj.bbox.width) / this.cellSize);
            const cy2 = Math.floor((obj.bbox.y + obj.bbox.height) / this.cellSize);
            for (let y = cy1; y <= cy2; y++) {
                for (let x = cx1; x <= cx2; x++) {
                    if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
                        this.grid[y * this.cols + x] += inter.thermalMass * 0.1;
                    }
                }
            }
        }
    }

    diffuse() {
        const next = new Float32Array(this.grid.length);
        for (let y = 1; y < this.rows - 1; y++) {
            for (let x = 1; x < this.cols - 1; x++) {
                const idx = y * this.cols + x;
                const laplacian =
                    this.grid[idx - 1] + this.grid[idx + 1] +
                    this.grid[idx - this.cols] + this.grid[idx + this.cols] -
                    4 * this.grid[idx];
                next[idx] = this.grid[idx] + this.diffusionRate * laplacian - this.decayRate * this.grid[idx];
                next[idx] = Math.max(0, next[idx]);
            }
        }
        this.grid = next;
    }

    getColor(value) {
        const clamped = Math.min(1, value);
        if (clamped < 0.25) return `rgba(0, 0, ${Math.round(clamped*4*255)}, ${clamped*2})`;
        if (clamped < 0.50) return `rgba(0, ${Math.round((clamped-0.25)*4*255)}, 255, ${clamped})`;
        if (clamped < 0.75) return `rgba(${Math.round((clamped-0.5)*4*255)}, 255, 0, ${clamped})`;
        return `rgba(255, ${Math.round((1-clamped)*4*255)}, 0, ${Math.min(0.7, clamped)})`;
    }

    render(ctx) {
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const val = this.grid[y * this.cols + x];
                if (val > 0.01) {
                    ctx.fillStyle = this.getColor(val);
                    ctx.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
                }
            }
        }
    }
}\n