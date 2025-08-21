import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Profile tab renders ProfileDetails component', () => {
  const content = fs.readFileSync('frontend/src/pages/Profile.jsx', 'utf8');
  assert.match(content, /<ProfileDetails profile={profile} \/>/);
});

test('ProfileDetails displays basic profile fields', () => {
  const content = fs.readFileSync('frontend/src/components/profile/ProfileDetails.jsx', 'utf8');
  assert.match(content, /profile\.name/);
  assert.match(content, /profile\.email/);
  assert.match(content, /profile\.avatarUrl/);
});
