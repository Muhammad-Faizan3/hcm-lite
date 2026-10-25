const bcrypt = require('bcryptjs');
const { Attendance, User } = require('./models');
const { initialAdminFromEnv } = require('./config');

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

async function bootstrapInitialAdmin(env = process.env) {
  const admin = initialAdminFromEnv(env);
  if (!admin) return;
  if (await User.exists({ role: 'admin' })) {
    console.log('Initial administrator already exists; bootstrap skipped.');
  } else {
    if (await User.exists({ email: admin.email })) {
      throw new Error('INITIAL_ADMIN_EMAIL is already registered to a non-admin account.');
    }
    try {
      await User.create({
        name: admin.name,
        email: admin.email,
        password: await bcrypt.hash(admin.password, 12),
        role: 'admin',
      });
      console.log('Initial administrator account created.');
    } catch (error) {
      if (error.code !== 11000 || !(await User.exists({ role: 'admin' }))) throw error;
      console.log('Initial administrator already exists; bootstrap skipped.');
    }
  }
  delete env.INITIAL_ADMIN_NAME;
  delete env.INITIAL_ADMIN_EMAIL;
  delete env.INITIAL_ADMIN_PASSWORD;
}

module.exports = { removeLegacyAttendanceIndex, bootstrapInitialAdmin };
