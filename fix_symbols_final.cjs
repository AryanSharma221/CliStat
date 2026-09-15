const fs = require('fs');
let html = fs.readFileSync('Simulation_Final/index.html', 'utf8');

// These are the exact corrupted strings as they appear in the file.
// Replace them with simple ASCII text to avoid any encoding issues.
const replacements = [
    // Playback buttons - replace with simple ASCII
    [/rewind-btn">[^<]*<\/button>/, 'rewind-btn">&laquo; -1H</button>'],
    [/play-pause-btn">[^<]*<\/button>/, 'play-pause-btn">&#9654;</button>'],
    [/forward-btn">[^<]*<\/button>/, 'forward-btn">+1H &raquo;</button>'],
    // Dropdowns - just use plain text, no emojis
    [/value="office">[^<]*<\/option>/, 'value="office">Modern Office (Generated)</option>'],
    [/value="household">[^<]*<\/option>/, 'value="household">Household / Apartment</option>'],
    [/value="Summer">[^<]*<\/option>/, 'value="Summer">Summer</option>'],
    [/value="Spring">[^<]*<\/option>/, 'value="Spring">Spring</option>'],
    [/value="Fall">[^<]*<\/option>/, 'value="Fall">Fall</option>'],
    [/value="Winter">[^<]*<\/option>/, 'value="Winter">Winter</option>'],
    // Reset button
    [/reset-btn" class="text-btn">[^<]*RESET<\/button>/, 'reset-btn" class="text-btn">RESET</button>'],
];

for (const [pattern, replacement] of replacements) {
    html = html.replace(pattern, replacement);
}

fs.writeFileSync('Simulation_Final/index.html', html, 'utf8');
console.log('Done: all corrupted symbols replaced with clean ASCII.');
