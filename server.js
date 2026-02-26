const express = require('express');
const cors    = require('cors');
const http    = require('http');
const { WebSocketServer } = require('ws');
const { initDB } = require('./db');
const usersRouter  = require('./users');
const eventsRouter = require('./events');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.json({ status: 'Agenda backend online ✓' }));
app.use('/api/users',  usersRouter);
app.use('/api/events', eventsRouter);

const server = http.createServer(app);
const wss    = new WebSocketServer({ server });
const clients = new Map(); // userId -> Set of ws

wss.on('connection', ws => {
  let userId = null;
  ws.on('message', raw => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'auth') {
        userId = msg.userId;
        if (!clients.has(userId)) clients.set(userId, new Set());
        clients.get(userId).add(ws);
      }
      if (msg.type === 'event_update' && userId) {
        const peers = clients.get(userId) || new Set();
        peers.forEach(peer => { if (peer !== ws && peer.readyState === 1) peer.send(raw); });
      }
    } catch(e) {}
  });
  ws.on('close', () => {
    if (userId && clients.has(userId)) {
      clients.get(userId).delete(ws);
      if (!clients.get(userId).size) clients.delete(userId);
    }
  });
});

const PORT = process.env.PORT || 3000;
initDB().then(() => {
  server.listen(PORT, () => console.log(`Server draait op poort ${PORT}`));
}).catch(e => { console.error('DB init mislukt:', e); process.exit(1); });
