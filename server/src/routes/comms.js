const r = require('express').Router();
const { Announcement, Notification, AuditLog, User } = require('../models');
const { ah, log, notify, httpError } = require('../helpers');
const { protect, allow } = require('../middleware/auth');
r.use(protect);

r.get('/announcements', ah(async (req, res) => res.json(await Announcement.find().populate('author', 'name').sort({ createdAt: -1 }).limit(50))));
r.post('/announcements', allow('admin', 'hr'), ah(async (req, res) => {
  const { title, body } = req.body;
  if (!title || !body) throw httpError(400, 'Title and message are required');
  const a = await Announcement.create({ title, body, author: req.user._id });
  const users = await User.find({ active: true }).select('_id');
  await Promise.all(users.filter((u) => String(u._id) !== String(req.user._id)).map((u) => notify(u._id, `New announcement: ${title}`, '/announcements')));
  await log(req, 'CREATE', 'Announcement', title); res.status(201).json(a);
}));
r.delete('/announcements/:id', allow('admin', 'hr'), ah(async (req, res) => {
  const a = await Announcement.findByIdAndDelete(req.params.id);
  if (!a) throw httpError(404, 'Announcement not found');
  await log(req, 'DELETE', 'Announcement', a.title); res.json({ ok: true });
}));

r.get('/notifications', ah(async (req, res) => {
  const items = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
  res.json({ items, unread: await Notification.countDocuments({ user: req.user._id, read: false }) });
}));
r.put('/notifications/read-all', ah(async (req, res) => { await Notification.updateMany({ user: req.user._id, read: false }, { read: true }); res.json({ ok: true }); }));
r.put('/notifications/:id/read', ah(async (req, res) => { await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { read: true }); res.json({ ok: true }); }));

r.get('/audit', allow('admin'), ah(async (req, res) => {
  const q = req.query.q ? { $or: ['actorName', 'action', 'entity', 'details'].map((f) => ({ [f]: new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })) } : {};
  res.json(await AuditLog.find(q).sort({ createdAt: -1 }).limit(200));
}));
module.exports = r;
