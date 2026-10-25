import { useEffect, useState } from 'react';
export const Badge = ({ v }) => <span className={`badge b-${v}`}>{v}</span>;
export const Stat = ({ label, value, hint, tone }) => (
  <div className={`stat ${tone || ''}`}><div className="stat-v">{value}</div><div className="stat-l">{label}</div>{hint && <div className="stat-h">{hint}</div>}</div>
);
export const Modal = ({ title, onClose, children }) => (
  <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className="modal" role="dialog" aria-label={title}><div className="modal-h"><h3>{title}</h3><button className="x" onClick={onClose} aria-label="Close">×</button></div>{children}</div>
  </div>
);
export const Field = ({ label, children }) => <label className="field"><span>{label}</span>{children}</label>;
export const Empty = ({ children }) => <div className="empty">{children}</div>;
export function Alert({ msg, kind = 'err' }) { return msg ? <div className={`alert ${kind}`} role="alert">{msg}</div> : null; }
export function useToast() {
  const [t, setT] = useState(null);
  useEffect(() => { if (t) { const id = setTimeout(() => setT(null), 3500); return () => clearTimeout(id); } }, [t]);
  return [t, (msg, kind = 'ok') => setT({ msg, kind })];
}
export const Toast = ({ t }) => (t ? <div className={`toast ${t.kind}`}>{t.msg}</div> : null);
