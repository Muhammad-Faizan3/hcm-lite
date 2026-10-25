import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { errMsg } from '../api';
import { Alert, Field } from '../ui.jsx';

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault(); setErr('');
    if (form.password !== form.confirmPassword) { setErr('Passwords do not match'); return; }
    setBusy(true);
    try {
      await register({ name: form.name, email: form.email, password: form.password });
    } catch (error) {
      setErr(errMsg(error)); setBusy(false);
    }
  };

  return (
    <div className="login">
      <div className="login-art"><h1>People, time and pay in one place.</h1><p>Create an employee account to manage your attendance, leave and payslips.</p></div>
      <div className="login-form">
        <form onSubmit={submit}>
          <h1>Create account</h1><p className="sub">New accounts have employee access.</p>
          <Alert msg={err} />
          <Field label="Full name"><input required maxLength={100} autoComplete="name" value={form.name} onChange={(event) => set('name', event.target.value)} autoFocus /></Field>
          <Field label="Email"><input type="email" required autoComplete="email" value={form.email} onChange={(event) => set('email', event.target.value)} /></Field>
          <Field label="Password"><input type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={(event) => set('password', event.target.value)} /></Field>
          <Field label="Confirm password"><input type="password" required minLength={8} autoComplete="new-password" value={form.confirmPassword} onChange={(event) => set('confirmPassword', event.target.value)} /></Field>
          <button className="btn" style={{ width: '100%' }} disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
          <p className="sub">Already have an account? <Link to="/login">Log in</Link></p>
        </form>
      </div>
    </div>
  );
}
