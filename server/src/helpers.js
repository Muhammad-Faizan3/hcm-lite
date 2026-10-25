const { Notification, AuditLog, User, Company } = require('./models');
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const log = (req, action, entity, details = '') =>
  AuditLog.create({ actor: req.user?._id, actorName: req.user?.name || req.user?.email, role: req.user?.role, action, entity, details }).catch(() => {});
const notify = (user, message, link) => Notification.create({ user, message, link }).catch(() => {});
const notifyRoles = async (roles, message, link, excludeId) => {
  const users = await User.find({ role: { $in: roles }, active: true }).select('_id');
  await Promise.all(users.filter((u) => String(u._id) !== String(excludeId)).map((u) => notify(u._id, message, link)));
};
const getCompany = async () => (await Company.findOne()) || (await Company.create({}));
const httpError = (status, message) => Object.assign(new Error(message), { status });
module.exports = { ah, log, notify, notifyRoles, getCompany, httpError };
