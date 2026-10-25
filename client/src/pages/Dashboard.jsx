import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg, money } from '../api';
import { useAuth } from '../auth.jsx';
import { Alert, Stat } from '../ui.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const [d, setD] = useState(null); const [err, setErr] = useState('');
  const [sum, setSum] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { api.get('/dashboard').then((r) => setD(r.data)).catch((e) => setErr(errMsg(e))); }, []);
  const summarize = async () => { setBusy(true); try { setSum((await api.post('/ai/summary')).data.summary); } catch (e) { setSum(errMsg(e)); } setBusy(false); };
  if (err) return <Alert msg={err} />;
  if (!d) return <div className="empty">Loading…</div>;
  const o = d.org, m = d.mine, max = o ? Math.max(1, ...o.week.map((w) => w.present)) : 1, dmax = o ? Math.max(1, ...o.byDepartment.map((x) => x.count)) : 1;
  return (
    <>
      <div className="row"><div><h1>Hello, {user.name.split(' ')[0]}</h1><p className="sub" style={{ margin: 0 }}>{new Date().toLocaleDateString([], { dateStyle: 'full' })}</p></div><div className="sp" />
        <button className="btn" onClick={summarize} disabled={busy}>{busy ? 'Summarizing…' : 'Summarize with AI'}</button></div>
      {sum && <div className="ai-box" style={{ marginBottom: 18 }}>{sum}</div>}
      {o && <>
        <div className="grid">
          <Stat label="Employees" value={o.totalEmployees} hint={`${o.roles.admin} admin · ${o.roles.hr} HR`} />
          <Stat label="Present today" value={o.presentToday} tone="ok" hint={`${o.lateToday} late`} />
          <Stat label="On leave" value={o.onLeaveToday} />
          <Stat label="Absent" value={o.absentToday} tone={o.absentToday ? 'bad' : ''} />
          <Stat label="Pending leave requests" value={o.pendingLeaves} tone={o.pendingLeaves ? 'warn' : ''} hint={<Link to="/leaves">Review</Link>} />
          <Stat label={o.lastPayroll ? `Payroll ${o.lastPayroll.month}` : 'Payroll'} value={o.lastPayroll ? money(o.lastPayroll.total) : '—'} hint={o.lastPayroll ? `${o.lastPayroll.count} payslips` : 'Not run yet'} />
        </div>
        <div className="two">
          <div className="card"><h2>Check-ins, last working days</h2><div className="bars">{o.week.map((w) => <div className="bar" key={w.date}><b>{w.present}</b><div style={{ height: `${(w.present / max) * 100}%` }} />{w.date.slice(5)}</div>)}</div></div>
          <div className="card"><h2>Employees by department</h2>{o.byDepartment.map((x) => <div className="hbar" key={x.name}><span>{x.name}</span><div style={{ width: `${(x.count / dmax) * 60}%` }} /><b>{x.count}</b></div>)}</div>
        </div>
        <h2>Your own summary</h2>
      </>}
      <div className="grid">
        <Stat label="Days present this month" value={m.presentThisMonth} hint={`${m.lateThisMonth} late · ${m.hoursThisMonth}h`} tone="ok" />
        <Stat label="Annual leave left" value={m.leaveBalance.annual} />
        <Stat label="Sick leave left" value={m.leaveBalance.sick} />
        <Stat label="Casual leave left" value={m.leaveBalance.casual} />
        <Stat label="Your pending requests" value={m.pendingLeaves} />
        <Stat label={m.lastPayslip ? `Net pay ${m.lastPayslip.month}` : 'Net pay'} value={m.lastPayslip ? money(m.lastPayslip.net) : '—'} />
      </div>
      {!m.checkedIn && <div className="card">You haven’t checked in today. <Link to="/attendance">Go to Attendance</Link></div>}
    </>
  );
}
