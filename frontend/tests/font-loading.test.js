const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const frontendDir = path.join(__dirname, '..');

const htmlFiles = fs.readdirSync(frontendDir, { withFileTypes: true })
  .filter(directory => directory.isDirectory())
  .flatMap(directory =>
    fs.readdirSync(path.join(frontendDir, directory.name))
      .filter(f => f.endsWith('.html'))
      .map(f => path.join(frontendDir, directory.name, f))
  );

test('Inter font loads only weights 400 and 600 with swap', () => {
  const fontUrl = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap';
  htmlFiles.forEach(file => {
    const html = fs.readFileSync(file, 'utf8');
    assert.ok(html.includes(fontUrl), `${file} should reference Inter 400 & 600 with swap`);
    assert.ok(!html.includes('wght@300'), `${file} should not request weight 300`);
    assert.ok(!html.includes('wght@500'), `${file} should not request weight 500`);
    assert.ok(!html.includes('wght@700'), `${file} should not request weight 700`);
    assert.ok(html.includes('display=swap'), `${file} should use font-display swap`);
  });
});

