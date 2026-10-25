require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const app = require('./app');
const { seed } = require('./seed');
const { validateJwtSecret, shouldSeedDemoData } = require('./config');
const { removeLegacyAttendanceIndex, bootstrapInitialAdmin } = require('./startup');

const { MONGO_URI } = process.env;
if (!MONGO_URI) { console.error('MONGO_URI must be set in server/.env or the environment.'); process.exit(1); }
try { validateJwtSecret(process.env.JWT_SECRET); } catch (e) { console.error(e.message); process.exit(1); }

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
