import { useCallback, useEffect, useState } from 'react';
import api, { errMsg, money } from '../api';
import { useAuth } from '../auth.jsx';
import { Alert, Badge, Empty, Field, Modal, Toast, useToast } from '../ui.jsx';

const blank = { name: '', email: '', password: '', role: 'employee', department: '', designation: '', phone: '', salary: { basic: 0, allowances: 0, deductions: 0 } };
export default function Employees() {
  const { user } = useAuth();
  const [list, setList] = useState([]); const [q, setQ] = useState(''); const [company, setCompany] = useState({ departments: [] });
  const [form, setForm] = useState(null); const [err, setErr] = useState(''); const [toast, say] = useToast();
  const load = useCallback(() => api.get('/users', { params: { q } }).then((r) => setList(r.data)).catch((e) => say(errMsg(e), 'err')), [q]);
  useEffect(() => { const id = setTimeout(load, 250); return () => clearTimeout(id); }, [load]);
  useEffect(() => { api.get('/company').then((r) => setCompany(r.data)); }, []);
  const canEdit = (u) => user.role === 'admin' || u.role === 'employee';
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const save = async (e) => {
    e.preventDefault(); setErr('');
    try {
      if (form._id) await api.put(`/users/${form._id}`, form); else await api.post('/users', form);
      setForm(null); say(form._id ? 'Employee updated' : 'Employee registered'); load();
    } catch (x) { setErr(errMsg(x)); }
  };
  const toggle = async (u) => { try { await api.put(`/users/${u._id}`, { active: !u.active }); say(u.active ? 'Employee deactivated' : 'Employee reactivated'); load(); } catch (e) { say(errMsg(e), 'err'); } };
  return (
    <>
      <div className="row"><div><h1>Employees</h1><p className="sub" style={{ margin: 0 }}>Register and manage your team.</p></div><div className="sp" />
        <input placeholder="Search name, email or ID" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn" onClick={() => { setErr(''); setForm(blank); }}>Register employee</button></div>
      <div className="card scroll">
        {list.length === 0 ? <Empty>No employees match your search.</Empty> :
          <table><thead><tr><th>ID</th><th>Name</th><th>Role</th><th>Department</th><th>Designation</th><th>Status</th><th /></tr></thead>
            <tbody>{list.map((u) => (
              <tr key={u._id}><td>{u.empId}</td><td><b>{u.name}</b><br /><small>{u.email}</small></td><td><Badge v={u.role} /></td><td>{u.department || '—'}</td><td>{u.designation || '—'}</td>
                <td>{u.active ? 'Active' : 'Inactive'}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{canEdit(u) && <><button className="btn ghost sm" onClick={() => { setErr(''); setForm({ ...u, password: '' }); }}>Edit</button>{' '}
                  {String(u._id) !== String(user._id) && <button className="btn ghost sm" onClick={() => toggle(u)}>{u.active ? 'Deactivate' : 'Reactivate'}</button>}</>}</td></tr>))}</tbody></table>}
      </div>
      {form && <Modal title={form._id ? 'Edit employee' : 'Register employee'} onClose={() => setForm(null)}>
        <form onSubmit={save}><Alert msg={err} />
          <div className="fgrid">
            <Field label="Full name"><input required value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
            <Field label="Email"><input type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
            <Field label={form._id ? 'New password (optional)' : 'Password'}><input type="password" required={!form._id} minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => set('password', e.target.value)} /></Field>
            <Field label="Role"><select value={form.role} disabled={user.role !== 'admin' || String(form._id) === String(user._id)} onChange={(e) => set('role', e.target.value)}><option value="employee">Employee</option><option value="hr">HR</option><option value="admin">Admin</option></select></Field>
            <Field label="Department"><select value={form.department || ''} onChange={(e) => set('department', e.target.value)}><option value="">Select…</option>{company.departments.map((d) => <option key={d}>{d}</option>)}</select></Field>
            <Field label="Designation"><input value={form.designation || ''} onChange={(e) => set('designation', e.target.value)} /></Field>
            <Field label="Phone"><input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} /></Field>
            {!form._id && <Field label="Basic salary"><input type="number" min="0" value={form.salary.basic} onChange={(e) => set('salary', { ...form.salary, basic: +e.target.value })} /></Field>}
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 0 }}><button type="button" className="btn ghost" onClick={() => setForm(null)}>Cancel</button><button className="btn">Save employee</button></div>
        </form></Modal>}
      <Toast t={toast} />
    </>
  );
}
