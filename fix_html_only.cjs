const fs = require('fs');
let html = fs.readFileSync('Simulation_Final/index.html', 'utf8');

// 1. Remove the Standard Reactive mode-option div (lines 45-51)
html = html.replace(
    /\s*<div class="mode-option" id="mode-standard">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
    '\n                    </div>'
);

// 2. Fix corrupted unicode symbols - exact replacements only
const fixes = [
    ['â¬¡', '⬡'],
    ['âœ¨', '✨'],
    ['â±', '⏱'],
    ['â†º', '↺'],
    ['âª', '⏪'],
    ['â¸', '⏸'],
    ['â©', '⏩'],
    ['ðŸ¢', '🏢'],
    ['ðŸ ', '🏠'],
    ['â˜€ï¸', '☀️'],
    ['ðŸŒ¸', '🌸'],
    ['ðŸ‚', '🍂'],
    ['â„ï¸', '❄️'],
    ['â€¢', '•'],
    ['â†—', '↗'],
];

for (const [bad, good] of fixes) {
    while (html.includes(bad)) {
        html = html.replace(bad, good);
    }
}

fs.writeFileSync('Simulation_Final/index.html', html, 'utf8');
console.log('Done: removed Standard Reactive + fixed all unicode.');
