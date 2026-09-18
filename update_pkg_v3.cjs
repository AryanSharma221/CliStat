const fs = require('fs');

let pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

pkg.scripts = {
    ...pkg.scripts,
    "dev:frontend": "vite",
    "dev:node": "node server/index.js",
    "dev:fastapi": "cd rl-backend && python app.py",
    "dev:all": "concurrently \"npm run dev:frontend\" \"npm run dev:node\" \"npm run dev:fastapi\""
};

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2), 'utf8');
console.log('package.json updated!');
