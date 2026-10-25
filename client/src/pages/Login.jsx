import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { errMsg } from '../api';
import { Alert, Field } from '../ui.jsx';

const DEMOS = [['Admin', 'admin@hcm.com', 'Admin@123'], ['HR', 'hr@hcm.com', 'Hr@12345'], ['Employee', 'sara@hcm.com', 'Emp@12345']];
export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await login(email, password); } catch (x) { setErr(errMsg(x)); setBusy(false); }
  };
  return (
    <div className="login">
      <div className="login-art"><h1>People, time and pay in one place.</h1><p>Attendance, leave, payroll and announcements for your whole team, with an assistant that reads your real records.</p></div>
      <div className="login-form">
        <form onSubmit={submit}>
          <h1>Log in</h1><p className="sub">Use your company account.</p>
          <Alert msg={err} />
          <Field label="Email"><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus /></Field>
          <Field label="Password"><input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <button className="btn" style={{ width: '100%' }} disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
          <p className="sub">New here? <Link to="/register">Create an employee account</Link></p>
          <div className="demo">Demo accounts (click to fill)
            {DEMOS.map(([r, e, p]) => <button type="button" key={r} onClick={() => { setEmail(e); setPassword(p); }}><b>{r}</b> · {e}</button>)}
          </div>
        </form>
      </div>
    </div>
  );
}
