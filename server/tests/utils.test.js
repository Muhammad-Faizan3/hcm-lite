const test = require('node:test');
const assert = require('node:assert');
const { weekdaysBetween, weekdaysInMonth, computeNet } = require('../src/utils');
const { fallbackParse, looksLikeLeave } = require('../src/services/ai');
const { validateJwtSecret, requireAccountPassword, shouldSeedDemoData, initialAdminFromEnv } = require('../src/config');
const apiHandler = require('../src/vercel-handler');

test('JWT secrets must be unique and sufficiently long', () => {
  assert.throws(() => validateJwtSecret('change-me-to-a-long-random-string'), /JWT_SECRET/);
  assert.throws(() => validateJwtSecret('change-me-to-a-placeholder-secret-12345'), /JWT_SECRET/);
  assert.throws(() => validateJwtSecret('too-short'), /JWT_SECRET/);
  assert.doesNotThrow(() => validateJwtSecret('unique-random-test-secret-123456789'));
});
test('new employee accounts require a non-default password', () => {
  assert.throws(() => requireAccountPassword(undefined), { status: 400 });
  assert.throws(() => requireAccountPassword('short'), { status: 400 });
  assert.strictEqual(requireAccountPassword('valid-passphrase'), 'valid-passphrase');
});
test('demo seed is disabled in production', () => {
  assert.strictEqual(shouldSeedDemoData({ nodeEnv: 'production', autoSeed: 'true' }), false);
  assert.strictEqual(shouldSeedDemoData({ nodeEnv: undefined, autoSeed: 'true' }), false);
  assert.strictEqual(shouldSeedDemoData({ nodeEnv: 'development', autoSeed: 'false' }), false);
  assert.strictEqual(shouldSeedDemoData({ nodeEnv: 'development', autoSeed: 'true' }), true);
});
test('initial admin bootstrap requires complete credentials and a long password', () => {
  assert.strictEqual(initialAdminFromEnv({}), null);
  assert.throws(() => initialAdminFromEnv({ INITIAL_ADMIN_NAME: 'Admin' }), /together/);
  assert.throws(() => initialAdminFromEnv({ INITIAL_ADMIN_NAME: 'Admin', INITIAL_ADMIN_EMAIL: 'admin@example.test', INITIAL_ADMIN_PASSWORD: 'short' }), /16 characters/);
  assert.deepStrictEqual(initialAdminFromEnv({ INITIAL_ADMIN_NAME: ' Admin ', INITIAL_ADMIN_EMAIL: 'ADMIN@example.test', INITIAL_ADMIN_PASSWORD: 'a-secure-test-password' }), {
    name: 'Admin', email: 'admin@example.test', password: 'a-secure-test-password',
  });
});

test('Vercel API entry point is an async handler', () => {
  assert.strictEqual(typeof apiHandler, 'function');
});

test('weekdays exclude weekends', () => {
  assert.strictEqual(weekdaysBetween('2026-10-23', '2026-10-27'), 3); // Fri, Mon, Tue
  assert.strictEqual(weekdaysBetween('2026-10-24', '2026-10-25'), 0); // Sat, Sun
});
test('leave spanning months only counts the requested month', () => {
  assert.strictEqual(weekdaysInMonth('2026-09-29', '2026-10-02', '2026-10'), 2);
});
test('net pay with unpaid leave', () => {
  const r = computeNet({ basic: 100000, allowances: 20000, deductions: 10000 }, 2, 20);
  assert.deepStrictEqual(r, { gross: 120000, unpaidDeduction: 12000, net: 98000 });
});
test('net pay never negative', () => {
  assert.strictEqual(computeNet({ basic: 100, allowances: 0, deductions: 500 }).net, 0);
});
test('leave intent detection and fallback parsing', () => {
  assert.ok(looksLikeLeave('I need a sick leave tomorrow'));
  assert.ok(looksLikeLeave('Can I request annual leave for next Monday?'));
  assert.ok(!looksLikeLeave('Which leave requests are pending?'));
  assert.ok(!looksLikeLeave('What is the leave policy?'));
  assert.ok(!looksLikeLeave('What is my salary?'));
  const p = fallbackParse('I am sick, need leave for 3 days from 2026-11-02');
  assert.strictEqual(p.type, 'sick'); assert.strictEqual(p.from, '2026-11-02'); assert.strictEqual(p.to, '2026-11-04');
});
