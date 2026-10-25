import { useCallback, useEffect, useState } from 'react';
import api, { errMsg, money } from '../api';
import { useAuth } from '../auth.jsx';
import { Empty, Toast, useToast } from '../ui.jsx';

const thisMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
export async function downloadPdf(p, say) {
  try {
    const r = await api.get(`/payroll/${p._id}/pdf`, { responseType: 'blob' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(r.data); a.download = `payslip-${p.month}.pdf`; a.click(); URL.revokeObjectURL(a.href);
  } catch (e) { say('Could not download the payslip', 'err'); }
}
export default function Payroll() {
  const { user } = useAuth(); const staff = user.role !== 'employee';
  const [mine, setMine] = useState([]); const [all, setAll] = useState([]); const [month, setMonth] = useState(thisMonth()); const [busy, setBusy] = useState(false); const [toast, say] = useToast();
  const load = useCallback(() => {
    api.get('/payroll/mine').then((r) => setMine(r.data));
    if (staff) api.get('/payroll', { params: { month } }).then((r) => setAll(r.data));
  }, [staff, month]);
  useEffect(() => { load(); }, [load]);
  const run = async () => {
    setBusy(true);
    try { const { data } = await api.post('/payroll/run', { month }); say(`Payroll for ${data.month}: ${data.count} payslips generated`); load(); } catch (e) { say(errMsg(e), 'err'); }
    setBusy(false);
  };
  return (
    <>
      <h1>Payslips{staff ? ' & payroll' : ''}</h1><p className="sub">Download your payslips as PDF.</p>
      {staff && <div className="card"><h2>Run monthly payroll</h2>
        <div className="row"><input type="month" value={month} max={thisMonth()} onChange={(e) => setMonth(e.target.value)} /><button className="btn" onClick={run} disabled={busy}>{busy ? 'Running…' : `Generate payroll for ${month}`}</button>
          <small>Running it again for the same month replaces that month’s payslips with current data.</small></div>
        <div className="scroll">{all.length === 0 ? <Empty>No payslips for {month} yet.</Empty> :
          <table><thead><tr><th>Employee</th><th>Present</th><th>Unpaid days</th><th>Gross</th><th>Deductions</th><th>Net</th><th /></tr></thead>
            <tbody>{all.map((p) => <tr key={p._id}><td>{p.user?.name}<br /><small>{p.user?.department}</small></td><td>{p.presentDays}</td><td>{p.unpaidDays}</td><td>{money(p.gross)}</td><td>{money(p.deductions + p.unpaidDeduction)}</td><td><b>{money(p.net)}</b></td><td><button className="btn ghost sm" onClick={() => downloadPdf(p, say)}>PDF</button></td></tr>)}</tbody>
            <tfoot><tr><td colSpan={5}><b>Total net</b></td><td colSpan={2}><b>{money(all.reduce((s, p) => s + p.net, 0))}</b></td></tr></tfoot></table>}</div></div>}
      <div className="card scroll"><h2>My payslips</h2>
        {mine.length === 0 ? <Empty>No payslips yet. They appear here after payroll is run.</Empty> :
          <table><thead><tr><th>Month</th><th>Gross</th><th>Deductions</th><th>Net pay</th><th /></tr></thead>
            <tbody>{mine.map((p) => <tr key={p._id}><td>{p.month}</td><td>{money(p.gross)}</td><td>{money(p.deductions + p.unpaidDeduction)}</td><td><b>{money(p.net)}</b></td><td><button className="btn ghost sm" onClick={() => downloadPdf(p, say)}>Download PDF</button></td></tr>)}</tbody></table>}</div>
      <Toast t={toast} />
    </>
  );
}
