function drawRooms(ctx, rooms) {
    ctx.strokeStyle = CONFIG.COLORS.roomWall;
    ctx.lineWidth = 4;
    for (const room of rooms) {
        ctx.strokeRect(room.x, room.y, room.width, room.height);
        ctx.fillStyle = CONFIG.COLORS.text;
        ctx.font = '16px Arial';
        ctx.fillText(room.name, room.x + 10, room.y + 20);
    }
}

function drawFurniture(ctx, rooms) {
    for (const room of rooms) {
        for (const obj of room.objects) {
            ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
            ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
            ctx.fillStyle = '#fff';
            ctx.font = '10px Arial';
            ctx.fillText(obj.label, obj.x + 5, obj.y + 15);
        }
    }
}

function drawBlinds(ctx, rooms) {
    for (const room of rooms) {
        for (const win of room.windows) {
            ctx.fillStyle = CONFIG.COLORS.window;
            ctx.fillRect(win.x, win.y, win.width, win.height);
            
            ctx.fillStyle = '#555';
            if (win.blindState === 'closed') {
                ctx.fillRect(win.x, win.y, win.width, win.height);
            } else if (win.blindState === 'half') {
                if (win.width > win.height) { // horizontal window
                    ctx.fillRect(win.x, win.y, win.width / 2, win.height);
                } else {
                    ctx.fillRect(win.x, win.y, win.width, win.height / 2);
                }
            }
        }
    }
}

function drawSunRays(ctx, sun, intersections, blindStates) {
    if (!sun || !sun.rays) return;
    ctx.strokeStyle = CONFIG.COLORS.sunRay;
    ctx.lineWidth = 2;
    for (const ray of sun.rays) {
        ctx.beginPath();
        ctx.moveTo(ray.x1, ray.y1);
        ctx.lineTo(ray.x2, ray.y2);
        ctx.stroke();
    }
}

function drawThermalHeatmap(ctx, heatmap) {
    if(heatmap) heatmap.render(ctx);
}

function drawIoTSensors(ctx, sensors) {
    if (!sensors) return;
    for (const s of sensors) {
        if (!s.x || !s.y) continue;
        ctx.fillStyle = 'orange';
        ctx.beginPath();
        ctx.arc(s.x, s.y, 4, 0, Math.PI*2);
        ctx.fill();
    }
}

function drawHVACIndicators(ctx, rooms, hvacPower) {
    for (const room of rooms) {
        const power = hvacPower[room.id] || 0;
        if (power > 0) {
            ctx.fillStyle = CONFIG.COLORS.cold;
            ctx.font = '14px Arial';
            ctx.fillText(`❄️ AC: ${Math.round(power)}%`, room.x + room.width - 80, room.y + 20);
        }
    }
}

function render(ctx, state) {
    ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    if(state.heatmap) drawThermalHeatmap(ctx, state.heatmap);
    drawRooms(ctx, state.rooms);
    drawFurniture(ctx, state.rooms);
    drawBlinds(ctx, state.rooms);
    drawSunRays(ctx, state.sun, state.intersections, state.blindStates);
    drawIoTSensors(ctx, state.sensorReadings);
    drawHVACIndicators(ctx, state.rooms, state.predictiveMode.hvacPower);
}