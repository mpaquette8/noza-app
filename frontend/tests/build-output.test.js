const test = require('node:test');
const assert = require('node:assert/strict');
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

test('Vite build generates hashed asset references', () => {
  execSync('node frontend/scripts/generate-env.js');
  execSync('npm --prefix frontend run build', { stdio: 'ignore' });
  const distDir = path.join(__dirname, '..', 'dist');
  const indexPathCandidate1 = path.join(distDir, 'app', 'index.html');
  const indexPath = fs.existsSync(indexPathCandidate1) ? indexPathCandidate1 : path.join(distDir, 'index.html');
  const html = fs.readFileSync(indexPath, 'utf-8');

  const scriptMatch = html.match(/src="(\.\/)?assets\/(.+?\.js)"/);
  assert.ok(scriptMatch, 'index.html should reference a script asset');
  const scriptRel = ((scriptMatch[1] || '') + 'assets/' + scriptMatch[2]).replace(/^\.\//, '');
  const scriptFile = path.join(path.dirname(indexPath), scriptRel);
  assert.ok(/-[a-f0-9]{8}\.js$/.test(scriptFile), 'script filename should contain hash');
  assert.ok(fs.existsSync(scriptFile), 'script file should exist');

  const cssMatch = html.match(/href="(\.\/)?assets\/(.+?\.css)"/);
  assert.ok(cssMatch, 'index.html should reference a css asset');
  const cssRel = ((cssMatch[1] || '') + 'assets/' + cssMatch[2]).replace(/^\.\//, '');
  const cssFile = path.join(path.dirname(indexPath), cssRel);
  assert.ok(/-[a-f0-9]{8}\.css$/.test(cssFile), 'css filename should contain hash');
  assert.ok(fs.existsSync(cssFile), 'css file should exist');
});
