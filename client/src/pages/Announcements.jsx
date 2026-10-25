import { useEffect, useState } from 'react';
import api, { dt, errMsg } from '../api';
import { useAuth } from '../auth.jsx';
import { Alert, Empty, Field, Toast, useToast } from '../ui.jsx';

export default function Announcements() {
  const { user } = useAuth(); const staff = user.role !== 'employee';
  const [list, setList] = useState([]); const [f, setF] = useState({ title: '', body: '' }); const [err, setErr] = useState(''); const [toast, say] = useToast();
  const load = () => api.get('/announcements').then((r) => setList(r.data));
  useEffect(() => { load(); }, []);
  const post = async (e) => { e.preventDefault(); setErr(''); try { await api.post('/announcements', f); setF({ title: '', body: '' }); say('Announcement posted'); load(); } catch (x) { setErr(errMsg(x)); } };
  const del = async (id) => { if (!confirm('Delete this announcement?')) return; try { await api.delete(`/announcements/${id}`); say('Announcement deleted'); load(); } catch (e) { say(errMsg(e), 'err'); } };
  return (
    <>
      <h1>Announcements</h1><p className="sub">News from HR and management.</p>
      {staff && <div className="card"><h2>Post an announcement</h2><Alert msg={err} /><form onSubmit={post}>
        <Field label="Title"><input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Message"><textarea required rows={3} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
        <button className="btn">Post to everyone</button></form></div>}
      {list.length === 0 ? <div className="card"><Empty>No announcements yet.</Empty></div> : list.map((a) => (
        <div className="card" key={a._id}><div className="row" style={{ marginBottom: 6 }}><h2 style={{ margin: 0 }}>{a.title}</h2><div className="sp" /><small>{a.author?.name} · {dt(a.createdAt)}</small>{staff && <button className="btn ghost sm" onClick={() => del(a._id)}>Delete</button>}</div><div style={{ whiteSpace: 'pre-wrap' }}>{a.body}</div></div>))}
      <Toast t={toast} />
    </>
  );
}
