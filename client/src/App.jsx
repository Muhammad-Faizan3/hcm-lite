import { NavLink, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from './auth.jsx';
import api from './api';
import ChatWidget from './ChatWidget.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Employees from './pages/Employees.jsx';
import Attendance from './pages/Attendance.jsx';
import Leaves from './pages/Leaves.jsx';
import Salary from './pages/Salary.jsx';
import Payroll from './pages/Payroll.jsx';
import Announcements from './pages/Announcements.jsx';
import Notifications from './pages/Notifications.jsx';
import Audit from './pages/Audit.jsx';
import Company from './pages/Company.jsx';
import Profile from './pages/Profile.jsx';

const NAV = [
  ['/', 'Dashboard', ['admin', 'hr', 'employee']],
  ['/attendance', 'Attendance', ['admin', 'hr', 'employee']],
  ['/leaves', 'Leaves', ['admin', 'hr', 'employee']],
  ['/payroll', 'Payslips & payroll', ['admin', 'hr', 'employee']],
  ['/announcements', 'Announcements', ['admin', 'hr', 'employee']],
  ['--', 'Management', ['admin', 'hr']],
  ['/employees', 'Employees', ['admin', 'hr']],
  ['/salary', 'Salary structure', ['admin', 'hr']],
  ['--', 'Admin', ['admin']],
  ['/company', 'Company setup', ['admin']],
  ['/audit', 'Audit log', ['admin']],
];

function Shell() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    const load = () => api.get('/notifications').then((r) => setUnread(r.data.unread)).catch(() => {});
    load(); const id = setInterval(load, 30000); window.addEventListener('notif-changed', load);
    return () => { clearInterval(id); window.removeEventListener('notif-changed', load); };
  }, []);
  const items = NAV.filter((n) => n[2].includes(user.role));
  return (
    <div className="app">
      <aside className="side">
        <div className="brand"><i /> HCM Lite</div>
        <nav className="nav">
          {items.map(([to, label]) => to === '--' ? <small key={label}>{label}</small> : <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>)}
        </nav>
        <div className="who"><b>{user.name}</b>{user.role === 'hr' ? 'HR' : user.role[0].toUpperCase() + user.role.slice(1)}<br /><NavLink to="/profile" style={{ color: '#a9cbc3' }}>Change password</NavLink></div>
      </aside>
      <div className="main">
        <div className="top">
          <select className="mnav" onChange={(e) => nav(e.target.value)} aria-label="Go to page">{items.filter((n) => n[0] !== '--').map(([to, l]) => <option key={to} value={to}>{l}</option>)}</select>
          <button className="bell" onClick={() => nav('/notifications')} aria-label="Notifications">🔔{unread > 0 && <span className="n">{unread}</span>}</button>
          <button className="btn ghost sm" onClick={logout}>Log out</button>
        </div>
        <main className="content"><Outlet /></main>
      </div>
      <ChatWidget />
    </div>
  );
}

const Guard = ({ roles, children }) => {
  const { user } = useAuth();
  return roles.includes(user.role) ? children : <div className="card"><h2>No access</h2><p>Your role ({user.role}) can’t open this page.</p></div>;
};
function Private() {
  const { user, loading } = useAuth();
  if (loading) return <div className="empty">Loading…</div>;
  return user ? <Shell /> : <Navigate to="/login" replace />;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route element={<Private />}>
        <Route index element={<Dashboard />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="leaves" element={<Leaves />} />
        <Route path="payroll" element={<Payroll />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
        <Route path="employees" element={<Guard roles={['admin', 'hr']}><Employees /></Guard>} />
        <Route path="salary" element={<Guard roles={['admin', 'hr']}><Salary /></Guard>} />
        <Route path="company" element={<Guard roles={['admin']}><Company /></Guard>} />
        <Route path="audit" element={<Guard roles={['admin']}><Audit /></Guard>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
