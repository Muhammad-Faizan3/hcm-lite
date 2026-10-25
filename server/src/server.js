require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const app = require('./app');
const { seed } = require('./seed');
const { Attendance, User } = require('./models');
const { validateJwtSecret, shouldSeedDemoData, initialAdminFromEnv } = require('./config');

const { MONGO_URI } = process.env;
if (!MONGO_URI) { console.error('MONGO_URI must be set in server/.env or the environment.'); process.exit(1); }
try { validateJwtSecret(process.env.JWT_SECRET); } catch (e) { console.error(e.message); process.exit(1); }

async function removeLegacyAttendanceIndex() {
  const indexes = await Attendance.collection.indexes();
  for (const index of indexes) {
    const keys = Object.keys(index.key);
    if (keys.length === 2 && index.key.employee === 1 && index.key.date === 1) {
      await Attendance.collection.dropIndex(index.name);
      console.log(`Removed obsolete attendance index "${index.name}".`);
    }
  }
}

async function bootstrapInitialAdmin() {
  const admin = initialAdminFromEnv(process.env);
  if (!admin) return;
  if (await User.exists({ role: 'admin' })) {
    console.log('Initial administrator already exists; bootstrap skipped.');
  } else {
    if (await User.exists({ email: admin.email })) {
      throw new Error('INITIAL_ADMIN_EMAIL is already registered to a non-admin account.');
    }
    await User.create({
      name: admin.name,
      email: admin.email,
      password: await bcrypt.hash(admin.password, 12),
      role: 'admin',
    });
    console.log('Initial administrator account created.');
  }
  delete process.env.INITIAL_ADMIN_NAME;
  delete process.env.INITIAL_ADMIN_EMAIL;
  delete process.env.INITIAL_ADMIN_PASSWORD;
}

mongoose.connect(MONGO_URI).then(async () => {
  console.log('MongoDB connected');
  await removeLegacyAttendanceIndex();
  await bootstrapInitialAdmin();
  if (shouldSeedDemoData({ nodeEnv: process.env.NODE_ENV, autoSeed: process.env.AUTO_SEED }) && (await seed())) {
    console.log('Empty development database: demo data created.');
  }
  if (process.env.NODE_ENV === 'production' && process.env.AUTO_SEED === 'true') {
    console.warn('AUTO_SEED=true is ignored in production.');
  }
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`HCM Lite running on port ${port}`));
}).catch((e) => { console.error('Server startup failed:', e); process.exit(1); });
