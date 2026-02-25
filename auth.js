// ─────────────────────────────────────────────────
// auth.js — Controleer of een gebruiker is ingelogd
// ─────────────────────────────────────────────────
// Hoe werkt inloggen in deze app?
//
//  1. Gebruiker logt in → server stuurt een "token" terug
//     (een lange string, bijv. "eyJhbGci...")
//  2. Bij elk volgend verzoek stuurt de app dat token mee
//     in de header: Authorization: Bearer <token>
//  3. Deze middleware controleert of het token klopt.
//     Als ja → verzoek gaat door.
//     Als nee → server stuurt "401 Niet ingelogd" terug.
// ─────────────────────────────────────────────────

const jwt = require('jsonwebtoken');

function requireLogin(req, res, next) {
  // Haal de Authorization header op
  const authHeader = req.headers['authorization'];

  // Controleer of de header aanwezig en correct is
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Niet ingelogd. Stuur een geldig token mee.' });
  }

  // Haal het token op (alles na "Bearer ")
  const token = authHeader.split(' ')[1];

  try {
    // Verifieer het token met de geheime sleutel uit .env
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Zet de gebruikersinfo op het request-object
    // zodat de route-handler weet wie de ingelogde gebruiker is
    req.user = decoded; // bevat: { id, email, name }

    next(); // ga door naar de volgende stap (de echte route-handler)
  } catch (err) {
    return res.status(401).json({ error: 'Token is ongeldig of verlopen. Log opnieuw in.' });
  }
}

module.exports = { requireLogin };
