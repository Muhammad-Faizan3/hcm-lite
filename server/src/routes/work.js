const r = require('express').Router();
const { User, Attendance, Leave } = require('../models');
const { ah, log, notify, notifyRoles, getCompany, httpError } = require('../helpers');
const { protect, allow } = require('../middleware/auth');
const { ymd, isYmd, weekdaysBetween } = require('../utils');
r.use(protect);

// ---------- Attendance
r.post('/attendance/check-in', ah(async (req, res) => {
  const date = ymd();
  if (await Attendance.findOne({ user: req.user._id, date })) throw httpError(400, 'You have already checked in today');
  const c = await getCompany();
  const now = new Date();
  const [h, m] = c.workStart.split(':').map(Number);
  const late = now.getHours() * 60 + now.getMinutes() > h * 60 + m + c.graceMinutes;
  const a = await Attendance.create({ user: req.user._id, date, checkIn: now, status: late ? 'late' : 'present' });
  res.status(201).json(a);
}));

r.post('/attendance/check-out', ah(async (req, res) => {
  const a = await Attendance.findOne({ user: req.user._id, date: ymd() });
  if (!a) throw httpError(400, 'You have not checked in today');
  if (a.checkOut) throw httpError(400, 'You have already checked out today');
  a.checkOut = new Date();
  a.hours = Math.round(((a.checkOut - a.checkIn) / 36e5) * 100) / 100;
  await a.save(); res.json(a);
}));

r.get('/attendance/mine', ah(async (req, res) => {
  const q = { user: req.user._id };
  if (req.query.month) q.date = new RegExp(`^${req.query.month}`);
  res.json(await Attendance.find(q).sort({ date: -1 }).limit(100));
}));

r.get('/attendance', allow('admin', 'hr'), ah(async (req, res) => {
  const q = {};
  if (req.query.date) q.date = req.query.date;
  else if (req.query.month) q.date = new RegExp(`^${req.query.month}`);
  if (req.query.user) q.user = req.query.user;
  res.json(await Attendance.find(q).populate('user', 'name empId department').sort({ date: -1 }).limit(500));
}));

// ---------- Leaves
const TYPES = ['annual', 'sick', 'casual', 'unpaid'];

r.post('/leaves', ah(async (req, res) => {
  const { type, from, to, reason = '' } = req.body;
  if (!TYPES.includes(type)) throw httpError(400, 'Choose a valid leave type');
  if (!isYmd(from) || !isYmd(to)) throw httpError(400, 'Choose valid start and end dates');
  if (to < from) throw httpError(400, 'End date cannot be before start date');
  const days = weekdaysBetween(from, to);
  if (days < 1) throw httpError(400, 'The selected dates contain no working days');
  if (type !== 'unpaid' && req.user.leaveBalance[type] < days)
    throw httpError(400, `Not enough ${type} leave: you have ${req.user.leaveBalance[type]} day(s) left and requested ${days}`);
  const clash = await Leave.findOne({ user: req.user._id, status: { $in: ['pending', 'approved'] }, from: { $lte: to }, to: { $gte: from } });
  if (clash) throw httpError(400, `These dates overlap an existing ${clash.status} leave (${clash.from} to ${clash.to})`);
  const l = await Leave.create({ user: req.user._id, type, from, to, days, reason });
  await log(req, 'APPLY', 'Leave', `${type} ${from}→${to} (${days}d)`);
  await notifyRoles(req.user.role === 'employee' ? ['hr', 'admin'] : ['admin'], `${req.user.name} requested ${days} day(s) of ${type} leave.`, '/leaves', req.user._id);
  res.status(201).json(l);
}));

r.get('/leaves/mine', ah(async (req, res) => res.json(await Leave.find({ user: req.user._id }).sort({ createdAt: -1 }))));

r.get('/leaves', allow('admin', 'hr'), ah(async (req, res) => {
  const q = req.query.status ? { status: req.query.status } : {};
  res.json(await Leave.find(q).populate('user', 'name empId department role').populate('reviewedBy', 'name').sort({ createdAt: -1 }).limit(300));
}));

r.put('/leaves/:id/review', allow('admin', 'hr'), ah(async (req, res) => {
  const { status, comment = '' } = req.body;
  if (!['approved', 'rejected'].includes(status)) throw httpError(400, 'Status must be approved or rejected');
  const l = await Leave.findById(req.params.id);
  if (!l) throw httpError(404, 'Leave request not found');
  if (l.status !== 'pending') throw httpError(400, `This request is already ${l.status}`);
  if (String(l.user) === String(req.user._id)) throw httpError(403, 'You cannot review your own leave request');
  const owner = await User.findById(l.user);
  if (owner.role !== 'employee' && req.user.role !== 'admin') throw httpError(403, 'Only an admin can review HR or Admin leave requests');
  if (status === 'approved' && l.type !== 'unpaid') {
    if (owner.leaveBalance[l.type] < l.days) throw httpError(400, `${owner.name} only has ${owner.leaveBalance[l.type]} ${l.type} day(s) left`);
    owner.leaveBalance[l.type] -= l.days; await owner.save();
  }
  l.status = status; l.comment = comment; l.reviewedBy = req.user._id; await l.save();
  await log(req, status.toUpperCase(), 'Leave', `${owner.name} ${l.type} ${l.from}→${l.to}`);
  await notify(owner._id, `Your ${l.type} leave (${l.from} to ${l.to}) was ${status}.${comment ? ' Note: ' + comment : ''}`, '/leaves');
  res.json(l);
}));

r.put('/leaves/:id/cancel', ah(async (req, res) => {
  const l = await Leave.findOne({ _id: req.params.id, user: req.user._id });
  if (!l) throw httpError(404, 'Leave request not found');
  if (l.status !== 'pending') throw httpError(400, 'Only pending requests can be cancelled');
  l.status = 'cancelled'; await l.save();
  await log(req, 'CANCEL', 'Leave', `${l.type} ${l.from}→${l.to}`); res.json(l);
}));
module.exports = r;
