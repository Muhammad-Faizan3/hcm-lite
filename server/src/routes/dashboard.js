const r = require('express').Router();
const { ah } = require('../helpers');
const { protect } = require('../middleware/auth');
const { orgStats, employeeStats } = require('../services/dashboard');
r.get('/', protect, ah(async (req, res) => {
  const mine = await employeeStats(req.user);
  if (req.user.role === 'employee') return res.json({ scope: 'employee', mine });
  res.json({ scope: 'org', org: await orgStats(), mine });
}));
module.exports = r;
