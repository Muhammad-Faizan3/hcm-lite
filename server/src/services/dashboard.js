const { User, Attendance, Leave, Payroll } = require('../models');
const { ymd, parseYmd } = require('../utils');

async function orgStats() {
  const today = ymd();
  const users = await User.find({ active: true });
  const todayAtt = await Attendance.find({ date: today });
  const onLeaveToday = await Leave.countDocuments({ status: 'approved', from: { $lte: today }, to: { $gte: today } });
  const pendingLeaves = await Leave.countDocuments({ status: 'pending' });
  const byDept = {};
  users.forEach((u) => { const d = u.department || 'Unassigned'; byDept[d] = (byDept[d] || 0) + 1; });
  const week = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const date = ymd(d);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    week.push({ date, present: await Attendance.countDocuments({ date }) });
  }
  const lastPayroll = await Payroll.aggregate([{ $group: { _id: '$month', total: { $sum: '$net' }, count: { $sum: 1 } } }, { $sort: { _id: -1 } }, { $limit: 1 }]);
  const present = todayAtt.length;
  return {
    today, totalEmployees: users.length, presentToday: present, lateToday: todayAtt.filter((a) => a.status === 'late').length,
    onLeaveToday, absentToday: Math.max(0, users.length - present - onLeaveToday), pendingLeaves,
    byDepartment: Object.entries(byDept).map(([name, count]) => ({ name, count })), week,
    lastPayroll: lastPayroll[0] ? { month: lastPayroll[0]._id, total: lastPayroll[0].total, count: lastPayroll[0].count } : null,
    roles: { admin: users.filter((u) => u.role === 'admin').length, hr: users.filter((u) => u.role === 'hr').length, employee: users.filter((u) => u.role === 'employee').length },
  };
}

async function employeeStats(user) {
  const month = ymd().slice(0, 7);
  const att = await Attendance.find({ user: user._id, date: new RegExp(`^${month}`) });
  const today = await Attendance.findOne({ user: user._id, date: ymd() });
  const leaves = await Leave.find({ user: user._id }).sort({ createdAt: -1 });
  const lastPay = await Payroll.findOne({ user: user._id }).sort({ month: -1 });
  return {
    today: ymd(), checkedIn: !!today, checkedOut: !!today?.checkOut, leaveBalance: user.leaveBalance,
    presentThisMonth: att.length, lateThisMonth: att.filter((a) => a.status === 'late').length,
    hoursThisMonth: Math.round(att.reduce((s, a) => s + (a.hours || 0), 0) * 10) / 10,
    pendingLeaves: leaves.filter((l) => l.status === 'pending').length,
    approvedLeaves: leaves.filter((l) => l.status === 'approved').length,
    lastPayslip: lastPay ? { month: lastPay.month, net: lastPay.net } : null,
  };
}
module.exports = { orgStats, employeeStats };
