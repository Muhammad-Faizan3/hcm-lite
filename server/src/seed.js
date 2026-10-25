const bcrypt = require('bcryptjs');
const { User, Company, Attendance, Leave, Payroll, Announcement, Notification, AuditLog } = require('./models');
const { ymd, weekdaysBetween } = require('./utils');
const { computeNet } = require('./utils');

async function seed({ reset = false } = {}) {
  if (reset) await Promise.all([User, Company, Attendance, Leave, Payroll, Announcement, Notification, AuditLog].map((m) => m.deleteMany({})));
  if (await User.countDocuments()) return false;
  await Company.create({ name: 'Acme Technologies', address: '12 Main Boulevard, Karachi', email: 'hr@acme.test', phone: '+92 21 1234567' });
  const h = (p) => bcrypt.hashSync(p, 10);
  const mk = (empId, name, email, pw, role, department, designation, basic, allowances, deductions) =>
    ({ empId, name, email, password: h(pw), role, department, designation, joinDate: new Date('2023-03-01'), salary: { basic, allowances, deductions } });
  const users = await User.insertMany([
    mk('EMP1001', 'Ayesha Khan', 'admin@hcm.com', 'Admin@123', 'admin', 'Management', 'Administrator', 300000, 50000, 20000),
    mk('EMP1002', 'Bilal Ahmed', 'hr@hcm.com', 'Hr@12345', 'hr', 'HR', 'HR Manager', 180000, 30000, 12000),
    mk('EMP1003', 'Sara Malik', 'sara@hcm.com', 'Emp@12345', 'employee', 'Engineering', 'Software Engineer', 150000, 20000, 9000),
    mk('EMP1004', 'Hamza Raza', 'hamza@hcm.com', 'Emp@12345', 'employee', 'Engineering', 'QA Engineer', 110000, 15000, 7000),
    mk('EMP1005', 'Fatima Noor', 'fatima@hcm.com', 'Emp@12345', 'employee', 'Finance', 'Accountant', 120000, 15000, 8000),
    mk('EMP1006', 'Usman Tariq', 'usman@hcm.com', 'Emp@12345', 'employee', 'Sales', 'Sales Executive', 90000, 12000, 5000),
  ]);
  const [admin, hr, sara, hamza, fatima, usman] = users;

  // attendance for the last 21 weekdays
  const rows = [];
  for (let i = 1; i <= 30; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    users.forEach((u, idx) => {
      if ((i + idx) % 9 === 0) return; // occasional absence
      const late = (i * 3 + idx) % 7 === 0;
      const inT = new Date(d); inT.setHours(late ? 9 : 8, late ? 40 : 50, 0, 0);
      const outT = new Date(d); outT.setHours(17, 5 + ((i + idx) % 40), 0, 0);
      rows.push({ user: u._id, date: ymd(d), checkIn: inT, checkOut: outT, hours: Math.round(((outT - inT) / 36e5) * 100) / 100, status: late ? 'late' : 'present' });
    });
  }
  await Attendance.insertMany(rows);

  const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
  const lv = (user, type, a, b, status, reason) => ({ user: user._id, type, from: a, to: b, days: Math.max(1, weekdaysBetween(a, b)), status, reason, reviewedBy: status === 'pending' ? undefined : hr._id });
  await Leave.insertMany([
    lv(sara, 'annual', day(10), day(12), 'pending', 'Family trip'),
    lv(hamza, 'sick', day(-12), day(-12), 'approved', 'Fever'),
    lv(usman, 'casual', day(3), day(3), 'pending', 'Bank work'),
    lv(fatima, 'unpaid', day(-40), day(-38), 'approved', 'Personal'),
  ]);
  await User.updateOne({ _id: hamza._id }, { $inc: { 'leaveBalance.sick': -1 } });

  // last month payroll
  const now = new Date(); const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const month = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  await Payroll.insertMany(users.map((u) => {
    const { gross, unpaidDeduction, net } = computeNet(u.salary, 0, 22);
    return { user: u._id, month, basic: u.salary.basic, allowances: u.salary.allowances, deductions: u.salary.deductions, unpaidDays: 0, unpaidDeduction, presentDays: 20, gross, net, generatedBy: hr._id };
  }));
  await Announcement.insertMany([
    { title: 'Welcome to HCM Lite', body: 'Check in daily from the Attendance page and apply for leave from the Leaves page. Ask the AI assistant if you have questions about policy.', author: admin._id },
    { title: 'Office closed on public holidays', body: 'The office will be closed on gazetted public holidays. Plan your leave accordingly.', author: hr._id },
  ]);
  await Notification.insertMany([sara, hamza, fatima, usman].map((u) => ({ user: u._id, message: `Your payslip for ${month} is ready.`, link: '/payroll' })));
  return true;
}
module.exports = { seed };

if (require.main === module) {
  require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
  const mongoose = require('mongoose');
  if (process.env.NODE_ENV !== 'development') {
    console.error('Refusing to run the destructive demo seed script unless NODE_ENV=development.');
    process.exit(1);
  }
  mongoose.connect(process.env.MONGO_URI).then(() => seed({ reset: true })).then(() => { console.log('Database reset and seeded.'); process.exit(0); }).catch((e) => { console.error(e); process.exit(1); });
}
