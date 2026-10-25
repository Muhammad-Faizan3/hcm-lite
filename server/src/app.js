const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();
app.use(cors());
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/people'));
app.use('/api', require('./routes/work'));
app.use('/api/payroll', require('./routes/payroll'));
app.use('/api', require('./routes/comms'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api', (req, res) => res.status(404).json({ message: 'Endpoint not found' }));

const dist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, req, res, next) => {
  if (err.code === 11000) return res.status(409).json({ message: 'That email address is already in use' });
  if (err.name === 'ValidationError') return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(', ') });
  if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid ID' });
  if (!err.status) console.error(`${req.method} ${req.originalUrl} failed:`, err);
  res.status(err.status || 500).json({ message: err.status ? err.message : 'Something went wrong on the server' });
});
module.exports = app;
