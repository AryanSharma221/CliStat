class PlaybackEngine {
    constructor() {
        this.recordings = JSON.parse(localStorage.getItem('thermostat_recordings') || '[]');
        this.currentRecording = null;
        this.isRecording = false;
        this.isPlaying = false;
        this.playbackIndex = 0;
    }

    startRecording(metadata = {}) {
        this.currentRecording = {
            id: Date.now().toString(36),
            startedAt: new Date().toISOString(),
            metadata: metadata,
            frames: []
        };
        this.isRecording = true;
    }

    recordFrame(state) {
        if (!this.isRecording) return;
        this.currentRecording.frames.push({
            t: state.simulatedHour,
            rooms: state.rooms.map(r => ({ id: r.id, tempF: r.tempF })),
            pred: { ...state.qPredicted },
            hvac: state.predictiveMode.hvacPower,
            hvacStd: state.standardMode.hvacPower,
            blinds: state.blindStates,
            weather: { temp: state.weather.outdoorTempF, cloud: state.weather.cloud },
            cost: state.economics ? state.economics.predictiveCost : 0,
            costStd: state.economics ? state.economics.standardCost : 0
        });
    }

    stopRecording() {
        if (!this.isRecording) return null;
        this.isRecording = false;
        this.currentRecording.endedAt = new Date().toISOString();
        this.currentRecording.frameCount = this.currentRecording.frames.length;
        this.recordings.push(this.currentRecording);

        if (this.recordings.length > 10) this.recordings.shift();
        localStorage.setItem('thermostat_recordings', JSON.stringify(this.recordings));

        return this.currentRecording.id;
    }

    playback(recordingId) {
        const rec = this.recordings.find(r => r.id === recordingId);
        if (!rec) return null;
        this.isPlaying = true;
        this.playbackIndex = 0;
        return rec;
    }

    getFrame(index) {
        if (!this.isPlaying || !this.currentRecording) return null;
        return this.currentRecording.frames[index] || null;
    }

    exportCSV(recordingId) {
        const rec = this.recordings.find(r => r.id === recordingId);
        if (!rec) return '';
        const headers = 'Hour,RoomTemp_Predictive,RoomTemp_Standard,HVAC_Predictive,HVAC_Standard,Q_Solar,Q_Occupancy,Q_Envelope,Q_Humidity,Q_Decay,Cost_Predictive,Cost_Standard,OutdoorTemp,CloudCover\\n';
        const rows = rec.frames.map(f => {
            const predTemp = f.rooms[0] ? f.rooms[0].tempF.toFixed(1) : 0;
            const hvacPred = Object.values(f.hvac)[0] || 0;
            const hvacStd = Object.values(f.hvacStd)[0] || 0;
            return `${f.t.toFixed(2)},${predTemp},${predTemp},${hvacPred},${hvacStd},${f.pred.solar.toFixed(3)},${f.pred.occupancy.toFixed(3)},${f.pred.envelope.toFixed(3)},${f.pred.latent.toFixed(3)},${f.pred.decay.toFixed(3)},${f.cost.toFixed(4)},${f.costStd.toFixed(4)},${f.weather.temp},${f.weather.cloud}`;
        }).join('\\n');
        return headers + rows;
    }

    listRecordings() {
        return this.recordings.map(r => ({
            id: r.id, startedAt: r.startedAt, frameCount: r.frameCount,
            metadata: r.metadata
        }));
    }
}