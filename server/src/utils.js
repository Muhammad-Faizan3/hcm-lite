const pad = (n) => String(n).padStart(2, '0');
const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const isYmd = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !isNaN(parseYmd(s));

// Count Mon-Fri days between two YYYY-MM-DD strings (inclusive)
function weekdaysBetween(from, to) {
  let n = 0;
  for (let d = parseYmd(from); d <= parseYmd(to); d.setDate(d.getDate() + 1)) {
    const w = d.getDay();
    if (w !== 0 && w !== 6) n++;
  }
  return n;
}
// Weekdays of [from,to] that fall inside month "YYYY-MM"
function weekdaysInMonth(from, to, month) {
  const [y, m] = month.split('-').map(Number);
  const start = ymd(new Date(y, m - 1, 1));
  const end = ymd(new Date(y, m, 0));
  const a = from > start ? from : start;
  const b = to < end ? to : end;
  return a > b ? 0 : weekdaysBetween(a, b);
}
// Net pay calculation
function computeNet({ basic = 0, allowances = 0, deductions = 0 }, unpaidDays = 0, workingDays = 22) {
  const gross = basic + allowances;
  const unpaidDeduction = Math.round((gross / workingDays) * unpaidDays);
  return { gross, unpaidDeduction, net: Math.max(0, gross - deductions - unpaidDeduction) };
}
module.exports = { ymd, parseYmd, isYmd, weekdaysBetween, weekdaysInMonth, computeNet };
