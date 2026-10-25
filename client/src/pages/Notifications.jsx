import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { dt } from '../api';
import { Empty } from '../ui.jsx';

export default function Notifications() {
  const [items, setItems] = useState([]); const nav = useNavigate();
  const load = () => api.get('/notifications').then((r) => setItems(r.data.items));
  useEffect(() => { load(); }, []);
  const open = async (n) => { if (!n.read) { await api.put(`/notifications/${n._id}/read`); window.dispatchEvent(new Event('notif-changed')); } if (n.link) nav(n.link); else load(); };
  const all = async () => { await api.put('/notifications/read-all'); window.dispatchEvent(new Event('notif-changed')); load(); };
  return (
    <>
      <div className="row"><h1 style={{ margin: 0 }}>Notifications</h1><div className="sp" /><button className="btn ghost" onClick={all}>Mark all as read</button></div>
      <div className="card">{items.length === 0 ? <Empty>You’re all caught up.</Empty> : items.map((n) => (
        <div key={n._id} onClick={() => open(n)} style={{ padding: '10px 4px', borderBottom: '1px solid var(--line)', cursor: 'pointer', fontWeight: n.read ? 400 : 600 }}>{!n.read && '● '}{n.message}<br /><small style={{ fontWeight: 400, color: 'var(--muted)' }}>{dt(n.createdAt)}</small></div>))}</div>
    </>
  );
}
