const mongoose = require('mongoose');
const { Schema } = mongoose;
const ref = (m) => ({ type: Schema.Types.ObjectId, ref: m });

const User = mongoose.model('User', new Schema({
  empId: String,
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'hr', 'employee'], default: 'employee' },
  department: String, designation: String, phone: String, joinDate: Date,
  active: { type: Boolean, default: true },
  salary: { basic: { type: Number, default: 0, min: 0 }, allowances: { type: Number, default: 0, min: 0 }, deductions: { type: Number, default: 0, min: 0 } },
  leaveBalance: { annual: { type: Number, default: 14 }, sick: { type: Number, default: 8 }, casual: { type: Number, default: 6 } },
}, { timestamps: true }));

const Company = mongoose.model('Company', new Schema({
  name: { type: String, default: 'My Company' }, address: String, email: String, phone: String,
  workStart: { type: String, default: '09:00' }, workEnd: { type: String, default: '17:00' },
  graceMinutes: { type: Number, default: 15 }, workingDays: { type: Number, default: 22 },
  departments: { type: [String], default: ['Engineering', 'HR', 'Finance', 'Sales'] },
}, { timestamps: true }));

const attendanceSchema = new Schema({
  user: { ...ref('User'), required: true }, date: { type: String, required: true },
  checkIn: Date, checkOut: Date, hours: { type: Number, default: 0 },
  status: { type: String, enum: ['present', 'late'], default: 'present' },
}, { timestamps: true });
attendanceSchema.index({ user: 1, date: 1 }, { unique: true });
const Attendance = mongoose.model('Attendance', attendanceSchema);

const Leave = mongoose.model('Leave', new Schema({
  user: { ...ref('User'), required: true },
  type: { type: String, enum: ['annual', 'sick', 'casual', 'unpaid'], required: true },
  from: { type: String, required: true }, to: { type: String, required: true }, days: { type: Number, required: true },
  reason: String,
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
  reviewedBy: ref('User'), comment: String,
}, { timestamps: true }));

const payrollSchema = new Schema({
  user: { ...ref('User'), required: true }, month: { type: String, required: true },
  basic: Number, allowances: Number, deductions: Number, unpaidDays: Number, unpaidDeduction: Number,
  presentDays: Number, gross: Number, net: Number, generatedBy: ref('User'),
}, { timestamps: true });
payrollSchema.index({ user: 1, month: 1 }, { unique: true });
const Payroll = mongoose.model('Payroll', payrollSchema);

const Announcement = mongoose.model('Announcement', new Schema({
  title: { type: String, required: true }, body: { type: String, required: true }, author: ref('User'),
}, { timestamps: true }));

const Notification = mongoose.model('Notification', new Schema({
  user: { ...ref('User'), required: true, index: true }, message: String, link: String, read: { type: Boolean, default: false },
}, { timestamps: true }));

const AuditLog = mongoose.model('AuditLog', new Schema({
  actor: ref('User'), actorName: String, role: String, action: String, entity: String, details: String,
}, { timestamps: true }));

module.exports = { User, Company, Attendance, Leave, Payroll, Announcement, Notification, AuditLog };
