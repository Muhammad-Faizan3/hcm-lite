import { useEffect, useState } from 'react';
import api, { errMsg } from '../api';
import { Alert, Field, Toast, useToast } from '../ui.jsx';

export default function Company() {
  const [c, setC] = useState(null); const [err, setErr] = useState(''); const [dept, setDept] = useState(''); const [toast, say] = useToast();
  useEffect(() => { api.get('/company').then((r) => setC(r.data)); }, []);
  if (!c) return <div className="empty">Loading…</div>;
  const set = (k, v) => setC({ ...c, [k]: v });
  const save = async (e) => { e.preventDefault(); setErr(''); try { await api.put('/company', c); say('Company settings saved'); } catch (x) { setErr(errMsg(x)); } };
  return (
    <>
      <h1>Company setup</h1><p className="sub">Details used on payslips and for attendance rules.</p>
      <form className="card" onSubmit={save}><Alert msg={err} />
        <div className="fgrid">
          <Field label="Company name"><input required value={c.name || ''} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="Address"><input value={c.address || ''} onChange={(e) => set('address', e.target.value)} /></Field>
          <Field label="Email"><input type="email" value={c.email || ''} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label="Phone"><input value={c.phone || ''} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="Work starts"><input type="time" value={c.workStart} onChange={(e) => set('workStart', e.target.value)} /></Field>
          <Field label="Work ends"><input type="time" value={c.workEnd} onChange={(e) => set('workEnd', e.target.value)} /></Field>
          <Field label="Grace period (minutes)"><input type="number" min="0" value={c.graceMinutes} onChange={(e) => set('graceMinutes', +e.target.value)} /></Field>
          <Field label="Working days per month (for payroll)"><input type="number" min="1" max="31" value={c.workingDays} onChange={(e) => set('workingDays', +e.target.value)} /></Field>
        </div>
        <Field label="Departments">
          <div className="row" style={{ marginBottom: 6 }}>{c.departments.map((d) => <span key={d} className="badge">{d} <a href="#" onClick={(e) => { e.preventDefault(); set('departments', c.departments.filter((x) => x !== d)); }} aria-label={`Remove ${d}`}>×</a></span>)}</div>
          <div className="row" style={{ marginBottom: 0 }}><input style={{ maxWidth: 220 }} placeholder="New department" value={dept} onChange={(e) => setDept(e.target.value)} />
            <button type="button" className="btn ghost" onClick={() => { const d = dept.trim(); if (d && !c.departments.includes(d)) set('departments', [...c.departments, d]); setDept(''); }}>Add department</button></div>
        </Field>
        <button className="btn">Save company settings</button>
      </form>
      <Toast t={toast} />
    </>
  );
}
