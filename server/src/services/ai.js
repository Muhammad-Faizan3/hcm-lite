const { User, Attendance, Leave, Payroll, Announcement } = require('../models');
const { orgStats, employeeStats } = require('./dashboard');
const { ymd, parseYmd, isYmd } = require('../utils');
const { getCompany } = require('../helpers');

const POLICY = `COMPANY HR POLICY
- Working hours: Monday to Friday, per company settings. Check-in after the grace period is marked "late".
- Leave types: annual (14 days/yr), sick (8 days/yr), casual (6 days/yr), unpaid (no limit, deducted from salary).
- Leave counts working days only (weekends excluded). Requests that overlap existing pending/approved leave are rejected.
- Leave is approved by HR or Admin. HR/Admin leave is approved by an Admin. Nobody can approve their own leave.
- Approved paid leave is deducted from the balance. Unpaid leave reduces pay: (basic + allowances) / working days x unpaid days.
- Payroll runs monthly. Net pay = basic + allowances - fixed deductions - unpaid leave deduction.
- Payslips are available as PDF from the Payroll page. Employees can only see their own payslips.
- Sick leave of 3+ days should be supported by a medical note shared with HR.
- Announcements are posted by HR/Admin and notify all employees.`;

async function llm(system, user, maxTokens = 700) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: process.env.AI_MODEL || 'claude-sonnet-5-5', max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
  });
  if (!resp.ok) throw new Error(`LLM request failed (${resp.status})`);
  const data = await resp.json();
  return (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
}

// Pull real DB data, scoped to the caller's role
async function buildContext(user) {
  const company = await getCompany();
  const ctx = { today: ymd(), company: { name: company.name, workStart: company.workStart, workEnd: company.workEnd, workingDays: company.workingDays, departments: company.departments },
    you: { name: user.name, role: user.role, department: user.department, designation: user.designation } };
  ctx.myStats = await employeeStats(user);
  ctx.myRecentAttendance = (await Attendance.find({ user: user._id }).sort({ date: -1 }).limit(10)).map((a) => ({ date: a.date, status: a.status, hours: a.hours }));
  ctx.myLeaves = (await Leave.find({ user: user._id }).sort({ createdAt: -1 }).limit(10)).map((l) => ({ type: l.type, from: l.from, to: l.to, days: l.days, status: l.status }));
  ctx.myPayslips = (await Payroll.find({ user: user._id }).sort({ month: -1 }).limit(3)).map((p) => ({ month: p.month, gross: p.gross, net: p.net, unpaidDays: p.unpaidDays }));
  ctx.announcements = (await Announcement.find().sort({ createdAt: -1 }).limit(5)).map((a) => ({ title: a.title, body: a.body.slice(0, 200) }));
  if (user.role !== 'employee') {
    ctx.organization = await orgStats();
    ctx.pendingLeaveRequests = (await Leave.find({ status: 'pending' }).populate('user', 'name department').limit(30)).map((l) => ({ employee: l.user?.name, department: l.user?.department, type: l.type, from: l.from, to: l.to, days: l.days, reason: l.reason }));
    ctx.employees = (await User.find({ active: true }).limit(100)).map((u) => ({ name: u.name, empId: u.empId, role: u.role, department: u.department, designation: u.designation, leaveBalance: u.leaveBalance }));
    ctx.todayAttendance = (await Attendance.find({ date: ymd() }).populate('user', 'name')).map((a) => ({ employee: a.user?.name, status: a.status, checkIn: a.checkIn }));
  }
  return ctx;
}

const SYSTEM = (ctx) => `You are the HCM Lite assistant, built into an HR management system. Answer using ONLY the DATABASE CONTEXT and HR POLICY below. If the answer is not in them, say you don't have that information. Never invent numbers, names or policies. The person asking is ${ctx.you.name} (role: ${ctx.you.role}); never reveal data outside the context. Be concise and friendly; use short paragraphs or simple lists.

${POLICY}

DATABASE CONTEXT (JSON, today is ${ctx.today}):
${JSON.stringify(ctx)}`;

function offlineAnswer(ctx, message) {
  const m = message.toLowerCase();
  const s = ctx.myStats;
  if (/balance|how many.*leave|leave.*left/.test(m)) return `Your leave balance: annual ${s.leaveBalance.annual}, sick ${s.leaveBalance.sick}, casual ${s.leaveBalance.casual} day(s).`;
  if (/policy|rule|late|working hours/.test(m)) return ctx.policy || POLICY;
  if (ctx.organization && /(summary|dashboard|today|attendance|pending)/.test(m)) {
    const o = ctx.organization;
    return `Today: ${o.presentToday} present (${o.lateToday} late), ${o.onLeaveToday} on leave, ${o.absentToday} absent out of ${o.totalEmployees} employees. ${o.pendingLeaves} leave request(s) are pending.`;
  }
  return `Basic mode (no LLM API key configured). This month you were present ${s.presentThisMonth} day(s) and late ${s.lateThisMonth}. Leave balance: annual ${s.leaveBalance.annual}, sick ${s.leaveBalance.sick}, casual ${s.leaveBalance.casual}. Add ANTHROPIC_API_KEY on the server for full AI answers.`;
}

async function chat(user, message) {
  const ctx = await buildContext(user);
  const reply = await llm(SYSTEM(ctx), message);
  return reply || offlineAnswer(ctx, message);
}

async function summarize(user) {
  const ctx = await buildContext(user);
  const reply = await llm(SYSTEM(ctx), 'Summarize my dashboard in 4-6 short bullet points: key numbers, anything that needs my attention, and one suggested action. Use only the data given.', 500);
  if (reply) return reply;
  if (ctx.organization) {
    const o = ctx.organization;
    return `- ${o.presentToday} of ${o.totalEmployees} employees present today (${o.lateToday} late)\n- ${o.onLeaveToday} on approved leave, ${o.absentToday} absent\n- ${o.pendingLeaves} leave request(s) waiting for review${o.lastPayroll ? `\n- Last payroll (${o.lastPayroll.month}): ${o.lastPayroll.count} payslips, total net ${o.lastPayroll.total}` : ''}`;
  }
  const s = ctx.myStats;
  return `- Present ${s.presentThisMonth} day(s) this month, ${s.lateThisMonth} late\n- ${s.pendingLeaves} leave request(s) pending\n- Balance: annual ${s.leaveBalance.annual}, sick ${s.leaveBalance.sick}, casual ${s.leaveBalance.casual}`;
}

// ---- Natural language -> leave form
const looksLikeLeave = (t) =>
  /\b(leave|day off|days off|off on|time off|vacation|holiday|sick|take off|need off|out of office)\b/i.test(t) &&
  (/\bi\s+(?:need|want|would like|plan to|am taking|will take)\b.{0,40}\b(?:leave|day off|time off)\b/i.test(t) ||
    /\b(?:apply for|request|book|take)\s+(?:a\s+)?(?:sick|annual|casual|unpaid)?\s*(?:leave|day off|time off)\b/i.test(t));

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
function fallbackParse(text) {
  const t = text.toLowerCase(); const now = new Date(); now.setHours(0, 0, 0, 0);
  const type = /sick|ill|fever|doctor|unwell|flu/.test(t) ? 'sick' : /unpaid/.test(t) ? 'unpaid' : /casual|personal|errand/.test(t) ? 'casual' : 'annual';
  const iso = t.match(/\d{4}-\d{2}-\d{2}/g) || [];
  let from, to;
  const n = t.match(/(\d+)\s*(?:working\s*)?days?/);
  if (iso.length) {
    from = iso[0];
    to = iso[1] || (n ? ymd(addDays(new Date(`${iso[0]}T00:00:00`), Math.min(30, +n[1]) - 1)) : iso[0]);
  } else {
    let start = now;
    if (/tomorrow/.test(t)) start = addDays(now, 1);
    else { const wd = DAYS.findIndex((d) => t.includes(d)); if (wd >= 0) { let diff = (wd - now.getDay() + 7) % 7; if (diff === 0 || /next/.test(t)) diff = diff || 7; start = addDays(now, diff); } }
    const days = n ? Math.min(30, +n[1]) : 1;
    from = ymd(start); to = ymd(addDays(start, days - 1));
  }
  return { type, from, to, reason: text.slice(0, 200) };
}

async function parseLeave(user, text) {
  const sys = `Convert the employee's leave request into JSON. Today is ${ymd()} (${DAYS[new Date().getDay()]}). Reply with ONLY a JSON object: {"type":"annual|sick|casual|unpaid","from":"YYYY-MM-DD","to":"YYYY-MM-DD","reason":"short reason"}. Use sick for illness, casual for personal errands, unpaid only if explicitly stated, else annual. Resolve relative dates (tomorrow, next Monday, for 3 days) from today. "to" equals "from" for a single day.`;
  let parsed = null;
  try {
    const out = await llm(sys, text, 200);
    const j = out && out.match(/\{[\s\S]*\}/);
    if (j) parsed = JSON.parse(j[0]);
  } catch { /* fall through to rule-based parser */ }
  if (!parsed || !['annual', 'sick', 'casual', 'unpaid'].includes(parsed.type) || !isYmd(parsed.from) || !isYmd(parsed.to)) parsed = fallbackParse(text);
  if (parsed.to < parsed.from) parsed.to = parsed.from;
  return { type: parsed.type, from: parsed.from, to: parsed.to, reason: String(parsed.reason || '').slice(0, 300) };
}

module.exports = { chat, summarize, parseLeave, looksLikeLeave, fallbackParse };
