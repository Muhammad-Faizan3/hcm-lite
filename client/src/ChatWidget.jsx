import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errMsg } from './api';
import { useAuth } from './auth.jsx';

export default function ChatWidget() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState('');
  const [msgs, setMsgs] = useState([{ from: 'a', text: `Hi ${user.name.split(' ')[0]}! Ask me about your leave balance, attendance, HR policy${user.role !== 'employee' ? ', or today’s team numbers' : ''}. You can also say “I need sick leave tomorrow” and I’ll fill in the form.` }]);
  const end = useRef();
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, open]);

  const send = async (q) => {
    const message = (q ?? text).trim();
    if (!message || busy) return;
    setText(''); setBusy(true); setMsgs((m) => [...m, { from: 'u', text: message }]);
    try {
      const { data } = await api.post('/ai/chat', { message });
      setMsgs((m) => [...m, { from: 'a', text: data.reply, draft: data.leaveDraft }]);
    } catch (e) { setMsgs((m) => [...m, { from: 'a', text: errMsg(e) }]); }
    setBusy(false);
  };
  const chips = user.role === 'employee' ? ['What is my leave balance?', 'What is the leave policy?', 'I need a casual leave tomorrow'] : ['Who is on leave today?', 'Which leave requests are pending?', 'What is the leave policy?'];

  if (!open) return <button className="chat-fab" onClick={() => setOpen(true)}>Ask AI</button>;
  return (
    <div className="chat" role="dialog" aria-label="AI assistant">
      <div className="chat-h"><b>HCM assistant</b><button onClick={() => setOpen(false)} aria-label="Close chat">×</button></div>
      <div className="chat-b">
        {msgs.map((m, i) => (
          <div key={i} className={`msg ${m.from}`}>{m.text}
            {m.draft && <div className="draft"><b>{m.draft.type}</b> leave · {m.draft.from} → {m.draft.to}<br />{m.draft.reason}
              <div style={{ marginTop: 6 }}><button className="btn sm" onClick={() => { setOpen(false); nav('/leaves', { state: { prefill: m.draft } }); }}>Review and submit</button></div></div>}
          </div>
        ))}
        {busy && <div className="msg a">Thinking…</div>}
        {msgs.length < 2 && <div className="chips">{chips.map((c) => <button key={c} onClick={() => send(c)}>{c}</button>)}</div>}
        <div ref={end} />
      </div>
      <div className="chat-f">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Ask a question…" aria-label="Message" />
        <button className="btn" onClick={() => send()} disabled={busy}>Send</button>
      </div>
    </div>
  );
}
