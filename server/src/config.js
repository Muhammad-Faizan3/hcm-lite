const JWT_PLACEHOLDERS = new Set([
  'change-me-to-a-long-random-string',
  'change-me',
  'secret',
  'your-secret',
  'your-secret-here',
]);

function validateJwtSecret(secret) {
  if (typeof secret !== 'string' || secret.length < 32 ||
      JWT_PLACEHOLDERS.has(secret.toLowerCase()) ||
      /^(change[-_ ]?me|your[-_ ]?secret|replace[-_ ]?me|secret|password)/i.test(secret)) {
    throw new Error('JWT_SECRET must be a unique, randomly generated value of at least 32 characters.');
  }
}

function requireAccountPassword(value) {
  const password = String(value || '');
  if (!password) throw Object.assign(new Error('A password is required when creating an account'), { status: 400 });
  if (password.length < 8) throw Object.assign(new Error('Password must be at least 8 characters'), { status: 400 });
  return password;
}

function shouldSeedDemoData({ nodeEnv, autoSeed }) {
  return nodeEnv === 'development' && autoSeed !== 'false';
}

function initialAdminFromEnv(env) {
  const name = String(env.INITIAL_ADMIN_NAME || '').trim();
  const email = String(env.INITIAL_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(env.INITIAL_ADMIN_PASSWORD || '');
  if (!name && !email && !password) return null;
  if (!name || !email || !password) {
    throw new Error('Set INITIAL_ADMIN_NAME, INITIAL_ADMIN_EMAIL, and INITIAL_ADMIN_PASSWORD together.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('INITIAL_ADMIN_EMAIL must be a valid email address.');
  }
  if (password.length < 16) {
    throw new Error('INITIAL_ADMIN_PASSWORD must be at least 16 characters.');
  }
  return { name, email, password };
}

module.exports = { validateJwtSecret, requireAccountPassword, shouldSeedDemoData, initialAdminFromEnv };
