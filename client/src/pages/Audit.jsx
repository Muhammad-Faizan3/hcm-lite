import { useEffect, useState } from 'react';
import api, { dt } from '../api';
import { Badge, Empty } from '../ui.jsx';

export default function Audit() {
  const [rows, setRows] = useState([]); const [q, setQ] = useState('');
  useEffect(() => { const id = setTimeout(() => api.get('/audit', { params: { q } }).then((r) => setRows(r.data)), 250); return () => clearTimeout(id); }, [q]);
  return (
    <>
      <div className="row"><div><h1>Audit log</h1><p className="sub" style={{ margin: 0 }}>Who did what, most recent first.</p></div><div className="sp" /><input placeholder="Search the log" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="card scroll">{rows.length === 0 ? <Empty>No log entries found.</Empty> :
        <table><thead><tr><th>When</th><th>User</th><th>Action</th><th>Item</th><th>Details</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r._id}><td style={{ whiteSpace: 'nowrap' }}>{dt(r.createdAt)}</td><td>{r.actorName} <Badge v={r.role || 'employee'} /></td><td><b>{r.action}</b></td><td>{r.entity}</td><td>{r.details}</td></tr>)}</tbody></table>}</div>
    </>
  );
}
