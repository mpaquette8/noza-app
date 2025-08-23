import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function hasPreload(html, href) {
  return html.includes(`<link rel="modulepreload" href="${href}">`);
}

test('app pages preload critical modules', () => {
  const appIndex = readFileSync('frontend/app/index.html', 'utf-8');
  assert.ok(hasPreload(appIndex, 'assets/js/utils/utils.js'));
  assert.ok(hasPreload(appIndex, 'assets/js/auth.js'));

  const onboarding = readFileSync('frontend/app/onboarding.html', 'utf-8');
  assert.ok(hasPreload(onboarding, 'assets/js/utils/utils.js'));
  assert.ok(hasPreload(onboarding, 'assets/js/auth.js'));
});

test('marketing pages preload critical modules', () => {
  const pages = ['index', 'contact', 'solutions', 'tarifs'];
  for (const page of pages) {
    const html = readFileSync(`frontend/marketing/${page}.html`, 'utf-8');
    assert.ok(hasPreload(html, 'assets/js/navigation.js'));
    assert.ok(hasPreload(html, 'assets/js/utils.js'));
  }
  const authHtml = readFileSync('frontend/marketing/auth.html', 'utf-8');
  assert.ok(hasPreload(authHtml, 'assets/js/navigation.js'));
  assert.ok(hasPreload(authHtml, 'assets/js/utils.js'));
  assert.ok(hasPreload(authHtml, 'assets/js/auth.js'));
});

test('app main lazily loads course-manager', () => {
  const js = readFileSync('frontend/app/assets/js/main.js', 'utf-8');
  assert.ok(js.includes("import('./course-manager.js')"));
  assert.ok(!js.includes("from './course-manager.js'"));
});

test('marketing auth lazily loads utils', () => {
  const js = readFileSync('frontend/marketing/assets/js/auth.js', 'utf-8');
  assert.ok(js.includes("import('./utils.js')"));
  assert.ok(!js.includes("from './utils.js'"));
});
