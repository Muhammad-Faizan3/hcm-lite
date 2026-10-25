const r = require('express').Router();
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { ah, log, getCompany, notify, httpError } = require('../helpers');
const { protect, allow } = require('../middleware/auth');
const { requireAccountPassword } = require('../config');
r.use(protect);

// ---- Company
r.get('/company', ah(async (req, res) => res.json(await getCompany())));
r.put('/company', allow('admin'), ah(async (req, res) => {
  const c = await getCompany();
  const { name, address, email, phone, workStart, workEnd, graceMinutes, workingDays, departments } = req.body;
  Object.assign(c, { name, address, email, phone, workStart, workEnd, graceMinutes, workingDays, departments });
  await c.save(); await log(req, 'UPDATE', 'Company', c.name); res.json(c);
}));

// ---- Employees
const EDITABLE = ['name', 'email', 'department', 'designation', 'phone', 'joinDate', 'role', 'active'];
const canManage = (actor, target) => actor.role === 'admin' || target.role === 'employee';
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

r.get('/users', allow('admin', 'hr'), ah(async (req, res) => {
  const q = {};
  if (req.query.department) q.department = req.query.department;
  if (req.query.q) q.$or = ['name', 'email', 'empId'].map((f) => ({ [f]: new RegExp(esc(req.query.q), 'i') }));
  res.json(await User.find(q).sort({ name: 1 }));
}));

r.post('/users', allow('admin', 'hr'), ah(async (req, res) => {
  const b = req.body;
  if (!b.name || !b.email) throw httpError(400, 'Name and email are required');
  const role = b.role || 'employee';
  if (!['admin', 'hr', 'employee'].includes(role)) throw httpError(400, 'Invalid role');
  if (role !== 'employee' && req.user.role !== 'admin') throw httpError(403, 'Only an admin can create Admin or HR accounts');
  const password = requireAccountPassword(b.password);
  const count = await User.countDocuments();
  const u = await User.create({
    name: b.name, email: b.email, department: b.department, designation: b.designation, phone: b.phone,
    role, empId: `EMP${1000 + count + 1}`, password: await bcrypt.hash(password, 10),
    salary: b.salary, joinDate: b.joinDate || new Date(),
  });
  await log(req, 'CREATE', 'Employee', `${u.name} (${u.role})`);
  await notify(u._id, `Welcome to the company, ${u.name}!`, '/');
  res.status(201).json(u);
}));

r.get('/users/:id', ah(async (req, res) => {
  if (!['admin', 'hr'].includes(req.user.role) && String(req.user._id) !== req.params.id) throw httpError(403, 'You can only view your own profile');
  const u = await User.findById(req.params.id);
  if (!u) throw httpError(404, 'Employee not found');
  res.json(u);
}));

r.put('/users/:id', allow('admin', 'hr'), ah(async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u) throw httpError(404, 'Employee not found');
  if (!canManage(req.user, u)) throw httpError(403, 'HR cannot modify Admin or HR accounts');
  if (req.body.role && req.body.role !== 'employee' && req.user.role !== 'admin') throw httpError(403, 'Only an admin can assign Admin or HR roles');
  if (String(u._id) === String(req.user._id) && (req.body.active === false || (req.body.role && req.body.role !== u.role))) throw httpError(400, 'You cannot disable or change the role of your own account');
  EDITABLE.forEach((k) => req.body[k] !== undefined && (u[k] = req.body[k]));
  if (req.body.password) {
    if (req.body.password.length < 8) throw httpError(400, 'Password must be at least 8 characters');
    u.password = await bcrypt.hash(req.body.password, 10);
  }
  await u.save(); await log(req, 'UPDATE', 'Employee', u.name); res.json(u);
}));

r.delete('/users/:id', allow('admin'), ah(async (req, res) => {
  if (req.params.id === String(req.user._id)) throw httpError(400, 'You cannot deactivate your own account');
  const u = await User.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
  if (!u) throw httpError(404, 'Employee not found');
  await log(req, 'DEACTIVATE', 'Employee', u.name); res.json(u);
}));

// ---- Salary
r.get('/salary/mine', ah(async (req, res) => res.json(req.user.salary)));
r.get('/salary', allow('admin', 'hr'), ah(async (req, res) => res.json(await User.find({ active: true }).select('name empId department designation role salary').sort({ name: 1 }))));
r.put('/salary/:id', allow('admin', 'hr'), ah(async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u) throw httpError(404, 'Employee not found');
  const s = {};
  for (const k of ['basic', 'allowances', 'deductions']) {
    const v = Number(req.body[k]);
    if (isNaN(v) || v < 0) throw httpError(400, `${k} must be a non-negative number`);
    s[k] = v;
  }
  u.salary = s; await u.save();
  await log(req, 'UPDATE_SALARY', 'Salary', `${u.name}: basic ${s.basic}, allowances ${s.allowances}, deductions ${s.deductions}`);
  await notify(u._id, 'Your salary structure was updated.', '/payroll');
  res.json(u);
}));
module.exports = r;
