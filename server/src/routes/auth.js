const r = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { ah, log } = require('../helpers');
const { protect } = require('../middleware/auth');

r.post('/register', ah(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!name || !email || !password) return res.status(400).json({ message: 'Name, email, and password are required' });
  if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

  const u = await User.create({ name, email, password: await bcrypt.hash(password, 10), role: 'employee' });
  const token = jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '8h' });
  await log({ user: u }, 'REGISTER', 'User', u.email);
  const user = u.toObject(); delete user.password;
  res.status(201).json({ token, user });
}));

r.post('/login', ah(async (req, res) => {
  const { email = '', password = '' } = req.body;
  const u = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
  if (!u || !u.active || !(await bcrypt.compare(String(password), u.password)))
    return res.status(401).json({ message: 'Incorrect email or password' });
  const token = jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '8h' });
  await log({ user: u }, 'LOGIN', 'User', u.email);
  const user = u.toObject(); delete user.password;
  res.json({ token, user });
}));

r.get('/me', protect, (req, res) => res.json(req.user));

r.post('/change-password', protect, ah(async (req, res) => {
  const { currentPassword = '', newPassword = '' } = req.body;
  if (newPassword.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters' });
  const u = await User.findById(req.user._id).select('+password');
  if (!(await bcrypt.compare(currentPassword, u.password))) return res.status(400).json({ message: 'Current password is incorrect' });
  u.password = await bcrypt.hash(newPassword, 10); await u.save();
  await log(req, 'CHANGE_PASSWORD', 'User', u.email);
  res.json({ message: 'Password updated' });
}));
module.exports = r;
