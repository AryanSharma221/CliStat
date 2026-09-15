const fs = require('fs');
const text = fs.readFileSync('Simulation_Final/index.html', 'utf8');

const checks = [
    [/rewind-btn.*?<\/button>/, 'REWIND'],
    [/play-pause-btn.*?<\/button>/, 'PLAY'],
    [/forward-btn.*?<\/button>/, 'FORWARD'],
    [/value="office">.*?<\/option>/, 'OFFICE'],
    [/value="household">.*?<\/option>/, 'HOUSEHOLD'],
    [/value="Fall">.*?<\/option>/, 'FALL'],
    [/value="Winter">.*?<\/option>/, 'WINTER'],
    [/PHYSICALLY LIT.*?LAYER/, 'FOOTER'],
    [/NEXT THERMAL EVENT.*?<\/span>/, 'EVENT'],
];

checks.forEach(([regex, label]) => {
    const m = text.match(regex);
    if (m) console.log(label + ':', m[0]);
});
