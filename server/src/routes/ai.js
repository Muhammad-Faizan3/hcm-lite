const r = require('express').Router();
const { ah, log, httpError } = require('../helpers');
const { protect } = require('../middleware/auth');
const ai = require('../services/ai');
r.use(protect);

r.post('/chat', ah(async (req, res) => {
  const message = String(req.body.message || '').trim().slice(0, 1000);
  if (!message) throw httpError(400, 'Type a question first');
  if (ai.looksLikeLeave(message)) {
    const leaveDraft = await ai.parseLeave(req.user, message);
    await log(req, 'AI_LEAVE_PREFILL', 'AI', message.slice(0, 100));
    return res.json({ reply: `I've filled in a leave form for you: ${leaveDraft.type} leave from ${leaveDraft.from} to ${leaveDraft.to}. Review it and submit when you're ready.`, leaveDraft });
  }
  await log(req, 'AI_CHAT', 'AI', message.slice(0, 100));
  res.json({ reply: await ai.chat(req.user, message) });
}));
r.post('/summary', ah(async (req, res) => { await log(req, 'AI_SUMMARY', 'AI'); res.json({ summary: await ai.summarize(req.user) }); }));
r.post('/leave-parse', ah(async (req, res) => res.json(await ai.parseLeave(req.user, String(req.body.text || '').slice(0, 1000)))));
module.exports = r;
