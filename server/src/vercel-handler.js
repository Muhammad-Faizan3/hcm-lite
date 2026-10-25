const mongoose = require('mongoose');
const app = require('./app');
const { validateJwtSecret } = require('./config');
const { removeLegacyAttendanceIndex, bootstrapInitialAdmin } = require('./startup');

let initialization;

async function initialize() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGO_URI);
  }
  await removeLegacyAttendanceIndex();
  await bootstrapInitialAdmin();
}

module.exports = async (req, res) => {
  try {
    const rewrittenUrl = new URL(req.url, 'http://localhost');
    const routePath = rewrittenUrl.searchParams.get('__vercel_path');
    if (routePath) {
      rewrittenUrl.searchParams.delete('__vercel_path');
      req.url = `/api${routePath}${rewrittenUrl.search ? `?${rewrittenUrl.searchParams}` : ''}`;
    }
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not configured');
    validateJwtSecret(process.env.JWT_SECRET);
    if (!initialization) {
      initialization = initialize().catch((error) => {
        initialization = null;
        throw error;
      });
    }
    await initialization;
    return app(req, res);
  } catch (error) {
    console.error('API initialization failed:', error);
    return res.status(503).json({ message: 'API is not ready. Check the server environment configuration.' });
  }
};
