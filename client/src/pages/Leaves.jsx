import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api, { errMsg, today } from '../api';
import { useAuth } from '../auth.jsx';
import { Alert, Badge, Empty, Field, Modal, Stat, Toast, useToast } from '../ui.jsx';

const nextWeekday = (date = today()) => {
  const d = new Date(`${date}T00:00:00`);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const hasWeekday = (from, to) => {
  const d = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (d <= end) {
    if (d.getDay() !== 0 && d.getDay() !== 6) return true;
    d.setDate(d.getDate() + 1);
  }
  return false;
};

export default function Leaves() {
  const { user, refresh } = useAuth();
  const staff = user.role !== 'employee';
  const { state } = useLocation();
  const initialDate = nextWeekday();
  const [form, setForm] = useState({ type: 'annual', from: initialDate, to: initialDate, reason: '', ...(state?.prefill || {}) });
  const [fromAI] = useState(!!state?.prefill);
  const [mine, setMine] = useState([]); const [queue, setQueue] = useState([]); const [err, setErr] = useState(''); const [toast, say] = useToast();
  const [review, setReview] = useState(null);
  const load = useCallback(() => {
    api.get('/leaves/mine').then((r) => setMine(r.data));
    if (staff) api.get('/leaves', { params: { status: 'pending' } }).then((r) => setQueue(r.data));
  }, [staff]);
  useEffect(() => { load(); refresh(); }, [load]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (form.to < form.from) {
      setErr('End date cannot be before start date.');
      return;
    }
    if (!hasWeekday(form.from, form.to)) {
      setErr('Choose at least one weekday (Monday to Friday) for leave.');
      return;
    }
    try {
      await api.post('/leaves', form);
      say('Leave request submitted');
      const date = nextWeekday();
      setForm({ type: 'annual', from: date, to: date, reason: '' });
      load();
    } catch (x) { setErr(errMsg(x)); }
  };
  const cancel = async (id) => { try { await api.put(`/leaves/${id}/cancel`); say('Request cancelled'); load(); } catch (e) { say(errMsg(e), 'err'); } };
  const decide = async (status) => {
    try { await api.put(`/leaves/${review.l._id}/review`, { status, comment: review.comment }); setReview(null); say(`Request ${status}`); load(); refresh(); } catch (e) { say(errMsg(e), 'err'); setReview(null); }
  };
  const b = user.leaveBalance;
  return (
    <>
      <h1>Leaves</h1><p className="sub">Apply for leave and track your requests.</p>
      <div className="grid"><Stat label="Annual left" value={b.annual} /><Stat label="Sick left" value={b.sick} /><Stat label="Casual left" value={b.casual} /></div>
      <div className="two">
        <div className="card"><h2>Apply for leave</h2>
          {fromAI && <Alert kind="ok" msg="Pre-filled by the AI assistant. Check the details, then submit." />}
          <Alert msg={err} />
          <form onSubmit={submit}>
            <Field label="Leave type"><select value={form.type} onChange={(e) => set('type', e.target.value)}><option value="annual">Annual</option><option value="sick">Sick</option><option value="casual">Casual</option><option value="unpaid">Unpaid</option></select></Field>
            <div className="fgrid"><Field label="From"><input type="date" required value={form.from} onChange={(e) => set('from', e.target.value)} /></Field>
              <Field label="To"><input type="date" required min={form.from} value={form.to} onChange={(e) => set('to', e.target.value)} /></Field></div>
            <Field label="Reason"><textarea rows={3} value={form.reason} onChange={(e) => set('reason', e.target.value)} /></Field>
            <button className="btn">Submit request</button>
          </form></div>
        <div className="card scroll"><h2>My requests</h2>
          {mine.length === 0 ? <Empty>You haven’t applied for any leave yet.</Empty> :
            <table><thead><tr><th>Type</th><th>Dates</th><th>Days</th><th>Status</th><th /></tr></thead><tbody>{mine.map((l) => <tr key={l._id}><td style={{ textTransform: 'capitalize' }}>{l.type}</td><td>{l.from} → {l.to}</td><td>{l.days}</td><td><Badge v={l.status} /></td><td>{l.status === 'pending' && <button className="btn ghost sm" onClick={() => cancel(l._id)}>Cancel</button>}</td></tr>)}</tbody></table>}</div>
      </div>
      {staff && <div className="card scroll"><h2>Waiting for your approval</h2>
        {queue.length === 0 ? <Empty>No pending requests.</Empty> :
          <table><thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th>Days</th><th>Reason</th><th /></tr></thead><tbody>{queue.map((l) => <tr key={l._id}><td>{l.user?.name}<br /><small>{l.user?.department}</small></td><td style={{ textTransform: 'capitalize' }}>{l.type}</td><td>{l.from} → {l.to}</td><td>{l.days}</td><td>{l.reason || '—'}</td>
            <td>{String(l.user?._id) !== String(user._id) ? <button className="btn sm" onClick={() => setReview({ l, comment: '' })}>Review</button> : <small>Your own request</small>}</td></tr>)}</tbody></table>}</div>}
      {review && <Modal title="Review leave request" onClose={() => setReview(null)}>
        <p><b>{review.l.user?.name}</b> · {review.l.type} · {review.l.from} → {review.l.to} ({review.l.days} day{review.l.days > 1 ? 's' : ''})<br />{review.l.reason}</p>
        <Field label="Comment (optional)"><textarea rows={2} value={review.comment} onChange={(e) => setReview({ ...review, comment: e.target.value })} /></Field>
        <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 0 }}><button className="btn bad" onClick={() => decide('rejected')}>Reject</button><button className="btn" onClick={() => decide('approved')}>Approve</button></div></Modal>}
      <Toast t={toast} />
    </>
  );
}
