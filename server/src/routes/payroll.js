const r = require('express').Router();
const PDFDocument = require('pdfkit');
const { User, Attendance, Leave, Payroll } = require('../models');
const { ah, log, notify, getCompany, httpError } = require('../helpers');
const { protect, allow } = require('../middleware/auth');
const { weekdaysInMonth, computeNet } = require('../utils');
r.use(protect);

const validMonth = (m) => /^\d{4}-(0[1-9]|1[0-2])$/.test(m || '');

r.post('/run', allow('admin', 'hr'), ah(async (req, res) => {
  const { month } = req.body;
  if (!validMonth(month)) throw httpError(400, 'Choose a month in YYYY-MM format');
  const now = new Date();
  if (month > `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`) throw httpError(400, 'You cannot run payroll for a future month');
  const c = await getCompany();
  const users = await User.find({ active: true });
  let count = 0, total = 0;
  for (const u of users) {
    if (!u.salary || u.salary.basic + u.salary.allowances <= 0) continue;
    const leaves = await Leave.find({ user: u._id, type: 'unpaid', status: 'approved' });
    const unpaidDays = leaves.reduce((s, l) => s + weekdaysInMonth(l.from, l.to, month), 0);
    const presentDays = await Attendance.countDocuments({ user: u._id, date: new RegExp(`^${month}`) });
    const { gross, unpaidDeduction, net } = computeNet(u.salary, unpaidDays, c.workingDays);
    await Payroll.findOneAndUpdate({ user: u._id, month }, {
      user: u._id, month, basic: u.salary.basic, allowances: u.salary.allowances, deductions: u.salary.deductions,
      unpaidDays, unpaidDeduction, presentDays, gross, net, generatedBy: req.user._id,
    }, { upsert: true, new: true, setDefaultsOnInsert: true });
    await notify(u._id, `Your payslip for ${month} is ready.`, '/payroll');
    count++; total += net;
  }
  await log(req, 'RUN_PAYROLL', 'Payroll', `${month}: ${count} payslips, total net ${total}`);
  res.json({ month, count, total });
}));

r.get('/', allow('admin', 'hr'), ah(async (req, res) => {
  const q = validMonth(req.query.month) ? { month: req.query.month } : {};
  res.json(await Payroll.find(q).populate('user', 'name empId department').sort({ month: -1 }).limit(500));
}));
r.get('/mine', ah(async (req, res) => res.json(await Payroll.find({ user: req.user._id }).sort({ month: -1 }))));

r.get('/:id/pdf', ah(async (req, res) => {
  const p = await Payroll.findById(req.params.id).populate('user');
  if (!p) throw httpError(404, 'Payslip not found');
  const isOwner = String(p.user._id) === String(req.user._id);
  if (!isOwner && !['admin', 'hr'].includes(req.user.role)) throw httpError(403, 'You can only download your own payslips');
  const c = await getCompany();
  const money = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="payslip-${p.user.empId}-${p.month}.pdf"`);
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(res);
  doc.font('Helvetica-Bold').fontSize(20).text(c.name);
  doc.font('Helvetica').fontSize(10).fillColor('#555').text(c.address || '');
  doc.moveDown().fillColor('#000').font('Helvetica-Bold').fontSize(14).text(`Payslip for ${p.month}`);
  doc.moveDown(0.5).font('Helvetica').fontSize(11);
  [['Employee', p.user.name], ['Employee ID', p.user.empId], ['Department', p.user.department || '-'],
   ['Designation', p.user.designation || '-'], ['Days present', p.presentDays], ['Unpaid leave days', p.unpaidDays]]
    .forEach(([k, v]) => doc.text(`${k}: ${v}`));
  doc.moveDown();
  const row = (label, val, bold) => {
    const y = doc.y;
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').text(label, 50, y, { width: 300 });
    doc.text(money(val), 350, y, { width: 190, align: 'right' });
    doc.moveDown(0.4);
  };
  row('Basic salary', p.basic); row('Allowances', p.allowances); row('Gross pay', p.gross, true);
  row('Fixed deductions', -p.deductions); row('Unpaid leave deduction', -p.unpaidDeduction);
  doc.moveTo(50, doc.y + 2).lineTo(540, doc.y + 2).stroke(); doc.moveDown(0.6);
  row('Net pay', p.net, true);
  doc.moveDown(2).font('Helvetica').fontSize(9).fillColor('#777').text('This is a system-generated payslip.');
  doc.end();
}));
module.exports = r;
