const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { ah } = require('../helpers');

const protect = ah(async (req, res, next) => {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return res.status(401).json({ message: 'Not authenticated' });
  let payload;
  try { payload = jwt.verify(h.slice(7), process.env.JWT_SECRET); } catch { return res.status(401).json({ message: 'Session expired, please log in again' }); }
  const user = await User.findById(payload.id);
  if (!user || !user.active) return res.status(401).json({ message: 'Account not found or disabled' });
  req.user = user;
  next();
});
const allow = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'You do not have permission to do this' });

module.exports = { protect, allow };
