// ─────────────────────────────────────────────────
// server.js — Hoofdbestand: start de server
// ─────────────────────────────────────────────────
// Dit bestand doet drie dingen:
//  1. Laadt omgevingsvariabelen uit .env
//  2. Start een Express-webserver (voor de API)
//  3. Start een WebSocket-server (voor real-time sync)
// ─────────────────────────────────────────────────

// Laad .env variabelen (DATABASE_URL, JWT_SECRET, PORT)
require('dotenv').config();

const express       = require('express');
const cors          = require('cors');
const http          = require('http');     // ingebouwd in Node.js
const WebSocket     = require('ws');
const { createTables } = require('./db');

// Importeer de route-bestanden
const userRoutes  = require('./routes/users');
const eventRoutes = require('./routes/events');

// ─── Express instellen ────────────────────────────
const app = express();

// CORS staat toe dat jouw frontend (op een andere URL) de API mag aanroepen
app.use(cors());

// Zodat Express JSON begrijpt in de request body
app.use(express.json());


// ─── Routes koppelen ─────────────────────────────
// Alles onder /api/users gaat naar routes/users.js
app.use('/api/users', userRoutes);

// Alles onder /api/events gaat naar routes/events.js
app.use('/api/events', eventRoutes);

// Eenvoudige health-check: bezoek / om te testen of de server draait
app.get('/', (req, res) => {
  res.json({ status: 'Agenda server draait ✅' });
});


// ─── HTTP-server aanmaken ─────────────────────────
// We maken een gewone HTTP-server van de Express app.
// Dit is nodig zodat WebSocket op dezelfde server kan draaien.
const server = http.createServer(app);


// ─── WebSocket server (real-time sync) ───────────
// WebSocket houdt een open verbinding open tussen
// server en client, zodat wijzigingen direct worden
// doorgestuurd naar alle apparaten van de gebruiker.
const wss = new WebSocket.Server({ server });

// Bijhouden welke clients verbonden zijn per gebruiker
// Structuur: { userId: [ client1, client2, ... ] }
const verbondenClients = {};

wss.on('connection', (ws) => {
  console.log('📡 Nieuwe WebSocket verbinding');

  let userId = null;

  // Ontvang berichten van de client
  ws.on('message', (data) => {
    try {
      const bericht = JSON.parse(data);

      // ── Stap 1: client identificeert zichzelf ──
      // De client stuurt: { type: "auth", userId: 42 }
      if (bericht.type === 'auth') {
        userId = bericht.userId;

        // Voeg deze verbinding toe aan de lijst voor deze gebruiker
        if (!verbondenClients[userId]) {
          verbondenClients[userId] = [];
        }
        verbondenClients[userId].push(ws);

        console.log(`👤 Gebruiker ${userId} verbonden (${verbondenClients[userId].length} apparaten)`);
      }

      // ── Stap 2: client stuurt een wijziging ────
      // Bijv. { type: "event_update", data: { ... } }
      // We sturen dit door naar alle andere apparaten van dezelfde gebruiker
      if (bericht.type === 'event_update' && userId) {
        stuurNaarAndereApparaten(userId, ws, bericht);
      }

    } catch (err) {
      console.error('Ongeldig WebSocket bericht:', err.message);
    }
  });

  // Als de verbinding wordt verbroken, verwijder de client uit de lijst
  ws.on('close', () => {
    if (userId && verbondenClients[userId]) {
      verbondenClients[userId] = verbondenClients[userId].filter(client => client !== ws);
      console.log(`❌ Gebruiker ${userId} verbroken. Nog ${verbondenClients[userId].length} apparaten over.`);
    }
  });
});

// Stuur een bericht naar alle andere apparaten van dezelfde gebruiker
function stuurNaarAndereApparaten(userId, afzender, bericht) {
  const clients = verbondenClients[userId] || [];
  let aantalVerstuurd = 0;

  clients.forEach(client => {
    // Niet naar de afzender zelf sturen (die heeft de wijziging al)
    if (client !== afzender && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(bericht));
      aantalVerstuurd++;
    }
  });

  if (aantalVerstuurd > 0) {
    console.log(`🔄 Sync verstuurd naar ${aantalVerstuurd} ander(e) apparaat/apparaten`);
  }
}


// ─── Server starten ───────────────────────────────
const PORT = process.env.PORT || 3000;

// Eerst de database-tabellen aanmaken, dan de server starten
createTables()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`🚀 Agenda server draait op poort ${PORT}`);
      console.log(`   Bezoek: http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Kon database niet initialiseren:', err.message);
    process.exit(1); // stop het programma als de database niet werkt
  });
