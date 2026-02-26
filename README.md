# Agenda — Backend

De server achter de Agenda kalender app.  
Gebouwd met Node.js, Express, PostgreSQL en WebSocket.

---

## 📋 Wat heb je nodig?

- [Node.js](https://nodejs.org) (versie 18 of hoger) — geïnstalleerd op je computer
- [Git](https://git-scm.com) — om de code naar Railway te sturen
- Een gratis account op [Railway.app](https://railway.app)

---

## 🚀 Stap-voor-stap: deployen op Railway

### Stap 1 — Zet de code op GitHub

1. Ga naar [github.com](https://github.com) en maak een gratis account aan
2. Maak een nieuw repository aan, noem het `agenda-backend`
3. Open een terminal in de map `agenda-backend` en voer uit:

```bash
git init
git add .
git commit -m "Eerste versie"
git remote add origin https://github.com/JOUW-NAAM/agenda-backend.git
git push -u origin main
```

---

### Stap 2 — Database aanmaken op Railway

1. Ga naar [railway.app](https://railway.app) en log in
2. Klik op **New Project**
3. Kies **Provision PostgreSQL**
4. Railway maakt nu een database voor je aan

---

### Stap 3 — Server deployen op Railway

1. Klik in hetzelfde project op **New** → **GitHub Repo**
2. Kies je `agenda-backend` repository
3. Railway detecteert automatisch dat het een Node.js project is

---

### Stap 4 — Omgevingsvariabelen instellen

Dit zijn de geheime instellingen die de server nodig heeft.

1. Klik op je server-service in Railway
2. Ga naar het tabblad **Variables**
3. Voeg toe:

| Naam | Waarde |
|------|--------|
| `DATABASE_URL` | Kopieer van: PostgreSQL service → Variables → `DATABASE_URL` |
| `JWT_SECRET` | Verzin zelf iets, bijv: `mijnGeheimeAgendaSleutel2026!` |
| `NODE_ENV` | `production` |

4. Klik **Deploy** — de server herstart automatisch

---

### Stap 5 — Controleer of het werkt

1. In Railway: klik op je server → tabblad **Settings** → kopieer de **Public Domain**
   (ziet eruit als `agenda-backend-production.up.railway.app`)
2. Bezoek in je browser: `https://JOUW-DOMEIN/`
3. Je ziet: `{ "status": "Agenda server draait ✅" }`

**Gefeliciteerd — je backend is live! 🎉**

---

## 💻 Lokaal testen (optioneel)

Wil je de server eerst op je eigen computer testen?

```bash
# 1. Installeer alle packages
npm install

# 2. Maak een .env bestand aan
cp .env.example .env
# Open .env en vul DATABASE_URL en JWT_SECRET in

# 3. Start de server
npm run dev
# → Server draait op http://localhost:3000
```

---

## 🔌 API Overzicht

Alle routes beginnen met je server-URL, bijv:
`https://agenda-backend-production.up.railway.app`

### Gebruikers

| Methode | URL | Wat doet het? |
|---------|-----|---------------|
| `POST` | `/api/users/register` | Nieuw account aanmaken |
| `POST` | `/api/users/login` | Inloggen, krijgt token terug |

### Events (vereist inloggen)

Stuur bij elk verzoek de header mee:
`Authorization: Bearer <jouw-token>`

| Methode | URL | Wat doet het? |
|---------|-----|---------------|
| `GET` | `/api/events` | Alle events ophalen |
| `POST` | `/api/events` | Nieuw event aanmaken |
| `PUT` | `/api/events/:id` | Event bewerken |
| `DELETE` | `/api/events/:id` | Event verwijderen |
| `GET` | `/api/events/calendars` | Kalenders ophalen |

---

## ⚡ WebSocket (real-time sync)

De server houdt ook een WebSocket verbinding open voor live sync tussen apparaten.

**Verbinden:**
```javascript
const ws = new WebSocket('wss://JOUW-DOMEIN');

// Stap 1: identificeer jezelf
ws.send(JSON.stringify({ type: 'auth', userId: 42 }));

// Stap 2: verstuur een wijziging
ws.send(JSON.stringify({ type: 'event_update', data: { id: 1, title: 'Nieuw' } }));

// Stap 3: ontvang wijzigingen van andere apparaten
ws.onmessage = (e) => {
  const bericht = JSON.parse(e.data);
  console.log('Sync ontvangen:', bericht);
};
```

---

## 🗂️ Bestandsstructuur

```
agenda-backend/
├── server.js          ← Startpunt: Express + WebSocket server
├── db.js              ← Database verbinding + tabellen aanmaken
├── auth.js            ← Middleware: controleer inlog-token
├── routes/
│   ├── users.js       ← Registreren + inloggen
│   └── events.js      ← Events ophalen/aanmaken/bewerken/verwijderen
├── package.json       ← Project info + dependencies
├── .env.example       ← Voorbeeld omgevingsvariabelen
└── .gitignore         ← Bestanden die NIET naar Git gaan
```

---

## ❓ Problemen?

- **"Cannot connect to database"** → Controleer of `DATABASE_URL` correct is ingesteld in Railway
- **"JWT_SECRET is not defined"** → Voeg `JWT_SECRET` toe in Railway Variables
- **Server start niet** → Bekijk de logs in Railway onder het tabblad **Logs**

Bij vragen: open een issue op GitHub of vraag het aan Claude 😊
