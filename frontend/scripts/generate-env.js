const fs = require('fs');
const path = require('path');

const apiUrl = process.env.API_URL || '/api';
const content = `window.ENV = {\n  API_URL: '${apiUrl}'\n};\n`;

const publicDir = path.join(__dirname, '..', 'public');
fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(path.join(publicDir, 'env.js'), content);

console.log(`Generated env.js with API_URL=${apiUrl}`);
