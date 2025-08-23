const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = __dirname;
const frontendDir = path.join(rootDir, 'frontend');
const backendPublicDir = path.join(rootDir, 'backend', 'public');

// Run Vite build in the frontend directory
execSync('node scripts/generate-env.js', { cwd: frontendDir, stdio: 'inherit' });
execSync('npx vite build', { cwd: frontendDir, stdio: 'inherit' });

// Copy the dist output to the backend public directory
const distDir = path.join(frontendDir, 'dist');
fs.rmSync(backendPublicDir, { recursive: true, force: true });
fs.mkdirSync(backendPublicDir, { recursive: true });
fs.cpSync(distDir, backendPublicDir, { recursive: true });

// Generate a simple manifest mapping original names to hashed files
const assetsDir = path.join(backendPublicDir, 'assets');
const manifest = {};
if (fs.existsSync(assetsDir)) {
  for (const file of fs.readdirSync(assetsDir)) {
    const match = file.match(/^(.*?)-([A-Za-z0-9-]+)(\.[^.]+)$/);
    if (match) {
      const original = match[1] + match[3];
      manifest[original] = `assets/${file}`;
    }
  }
}
fs.writeFileSync(path.join(backendPublicDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

// Update HTML files to reference hashed asset names
const updateHtml = dir => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      updateHtml(full);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      let html = fs.readFileSync(full, 'utf8');
      for (const [orig, hashed] of Object.entries(manifest)) {
        html = html.replace(new RegExp(orig, 'g'), hashed);
      }
      fs.writeFileSync(full, html);
    }
  }
};
updateHtml(backendPublicDir);
