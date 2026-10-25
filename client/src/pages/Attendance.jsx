import { useCallback, useEffect, useState } from 'react';
import api, { errMsg, today, tm } from '../api';
import { useAuth } from '../auth.jsx';
import { Alert, Badge, Empty, Toast, useToast } from '../ui.jsx';

export default function Attendance() {
  const { user } = useAuth();
  const staff = user.role !== 'employee';
  const [tab, setTab] = useState('mine'); const [mine, setMine] = useState([]); const [all, setAll] = useState([]);
  const [date, setDate] = useState(today()); const [busy, setBusy] = useState(false); const [toast, say] = useToast();
  const loadMine = useCallback(() => api.get('/attendance/mine').then((r) => setMine(r.data)), []);
  useEffect(() => { loadMine(); }, [loadMine]);
  useEffect(() => { if (tab === 'all') api.get('/attendance', { params: { date } }).then((r) => setAll(r.data)).catch((e) => say(errMsg(e), 'err')); }, [tab, date]);
  const todayRec = mine.find((a) => a.date === today());
  const act = async (path, msg) => { setBusy(true); try { await api.post(`/attendance/${path}`); say(msg); await loadMine(); } catch (e) { say(errMsg(e), 'err'); } setBusy(false); };
  const Table = ({ rows, showUser }) => rows.length === 0 ? <Empty>No attendance records.</Empty> : (
    <table><thead><tr>{showUser && <th>Employee</th>}<th>Date</th><th>Check in</th><th>Check out</th><th>Hours</th><th>Status</th></tr></thead>
      <tbody>{rows.map((a) => <tr key={a._id}>{showUser && <td>{a.user?.name}<br /><small>{a.user?.department}</small></td>}<td>{a.date}</td><td>{tm(a.checkIn)}</td><td>{tm(a.checkOut)}</td><td>{a.hours || '—'}</td><td><Badge v={a.status} /></td></tr>)}</tbody></table>);
  return (
    <>
      <h1>Attendance</h1><p className="sub">Check in when you start and check out when you finish.</p>
      <div className="card row" style={{ marginBottom: 18 }}>
        <div><b>Today, {today()}</b><br /><span className="sub">{!todayRec ? 'Not checked in yet' : todayRec.checkOut ? `Done: ${tm(todayRec.checkIn)} to ${tm(todayRec.checkOut)} (${todayRec.hours}h)` : `Checked in at ${tm(todayRec.checkIn)}${todayRec.status === 'late' ? ' (late)' : ''}`}</span></div><div className="sp" />
        <button className="btn" disabled={busy || !!todayRec} onClick={() => act('check-in', 'Checked in')}>Check in</button>
        <button className="btn ghost" disabled={busy || !todayRec || !!todayRec?.checkOut} onClick={() => act('check-out', 'Checked out')}>Check out</button>
      </div>
      {staff && <div className="row"><button className={`btn ${tab === 'mine' ? '' : 'ghost'}`} onClick={() => setTab('mine')}>My records</button><button className={`btn ${tab === 'all' ? '' : 'ghost'}`} onClick={() => setTab('all')}>Everyone</button>
        {tab === 'all' && <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />}</div>}
      <div className="card scroll">{tab === 'mine' ? <Table rows={mine} /> : <Table rows={all} showUser />}</div>
      <Toast t={toast} />
    </>
  );
}
