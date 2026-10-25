import { useEffect, useState } from 'react';
import api, { errMsg, money } from '../api';
import { Alert, Field, Modal, Toast, useToast } from '../ui.jsx';

export default function Salary() {
  const [list, setList] = useState([]); const [edit, setEdit] = useState(null); const [err, setErr] = useState(''); const [toast, say] = useToast();
  const load = () => api.get('/salary').then((r) => setList(r.data));
  useEffect(() => { load(); }, []);
  const save = async (e) => {
    e.preventDefault(); setErr('');
    try { await api.put(`/salary/${edit._id}`, edit.salary); setEdit(null); say('Salary updated'); load(); } catch (x) { setErr(errMsg(x)); }
  };
  const s = (k, v) => setEdit({ ...edit, salary: { ...edit.salary, [k]: v } });
  return (
    <>
      <h1>Salary structure</h1><p className="sub">Monthly basic pay, allowances and fixed deductions. Payroll uses these values.</p>
      <div className="card scroll"><table><thead><tr><th>Employee</th><th>Department</th><th>Basic</th><th>Allowances</th><th>Deductions</th><th>Net (before unpaid leave)</th><th /></tr></thead>
        <tbody>{list.map((u) => <tr key={u._id}><td><b>{u.name}</b><br /><small>{u.empId}</small></td><td>{u.department || '—'}</td><td>{money(u.salary.basic)}</td><td>{money(u.salary.allowances)}</td><td>{money(u.salary.deductions)}</td><td><b>{money(u.salary.basic + u.salary.allowances - u.salary.deductions)}</b></td>
          <td><button className="btn ghost sm" onClick={() => { setErr(''); setEdit(JSON.parse(JSON.stringify(u))); }}>Edit</button></td></tr>)}</tbody></table></div>
      {edit && <Modal title={`Salary: ${edit.name}`} onClose={() => setEdit(null)}><form onSubmit={save}><Alert msg={err} />
        <Field label="Basic salary"><input type="number" min="0" required value={edit.salary.basic} onChange={(e) => s('basic', +e.target.value)} /></Field>
        <Field label="Allowances"><input type="number" min="0" required value={edit.salary.allowances} onChange={(e) => s('allowances', +e.target.value)} /></Field>
        <Field label="Fixed deductions (tax, insurance)"><input type="number" min="0" required value={edit.salary.deductions} onChange={(e) => s('deductions', +e.target.value)} /></Field>
        <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 0 }}><button type="button" className="btn ghost" onClick={() => setEdit(null)}>Cancel</button><button className="btn">Save salary</button></div></form></Modal>}
      <Toast t={toast} />
    </>
  );
}
