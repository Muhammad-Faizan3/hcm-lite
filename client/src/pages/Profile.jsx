import { useState } from 'react';
import api, { errMsg } from '../api';
import { useAuth } from '../auth.jsx';
import { Alert, Field } from '../ui.jsx';

export default function Profile() {
  const { user } = useAuth();
  const [f, setF] = useState({ currentPassword: '', newPassword: '' }); const [msg, setMsg] = useState(null);
  const save = async (e) => { e.preventDefault(); setMsg(null); try { await api.post('/auth/change-password', f); setMsg({ kind: 'ok', text: 'Password updated' }); setF({ currentPassword: '', newPassword: '' }); } catch (x) { setMsg({ kind: 'err', text: errMsg(x) }); } };
  return (
    <>
      <h1>My profile</h1><p className="sub">{user.name} · {user.email} · {user.empId}</p>
      <form className="card" style={{ maxWidth: 420 }} onSubmit={save}><h2>Change password</h2>{msg && <Alert kind={msg.kind} msg={msg.text} />}
        <Field label="Current password"><input type="password" required value={f.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} /></Field>
        <Field label="New password (8+ characters)"><input type="password" required minLength={8} value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} /></Field>
        <button className="btn">Update password</button></form>
    </>
  );
}
