// ─────────────────────────────────────────────────
// routes/users.js — Registreren en inloggen
// ─────────────────────────────────────────────────

const express  = require('express');
const bcrypt   = require('bcryptjs');  // voor het hashen van wachtwoorden
const jwt      = require('jsonwebtoken');
const { pool } = require('../db');

const router = express.Router();

// ── POST /api/users/register ──────────────────────
// Nieuw account aanmaken
//
// Verwacht in de body:
//   { "name": "Jan", "email": "jan@mail.com", "password": "geheim123" }
//
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  // Simpele validatie — zijn alle velden ingevuld?
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Naam, e-mail en wachtwoord zijn verplicht.' });
  }

  try {
    // Controleer of dit e-mailadres al bestaat
    const bestaand = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    if (bestaand.rows.length > 0) {
      return res.status(409).json({ error: 'Dit e-mailadres is al in gebruik.' });
    }

    // Hash het wachtwoord (nooit plaintext opslaan!)
    // Getal 10 = "cost factor" — hoger = veiliger maar trager
    const gehashtWachtwoord = await bcrypt.hash(password, 10);

    // Sla de gebruiker op in de database
    const result = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, gehashtWachtwoord]
    );
    const user = result.rows[0];

    // Maak standaard kalenders aan voor de nieuwe gebruiker
    await pool.query(
      `INSERT INTO calendars (user_id, name, color) VALUES
        ($1, 'Werk',        '#4F7CFF'),
        ($1, 'Persoonlijk', 'rgba(79,124,255,0.6)'),
        ($1, 'Familie',     'rgba(79,124,255,0.38)')`,
      [user.id]
    );

    // Maak een inlog-token aan dat 7 dagen geldig is
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });

  } catch (err) {
    console.error('Fout bij registreren:', err.message);
    res.status(500).json({ error: 'Er is iets misgegaan. Probeer opnieuw.' });
  }
});


// ── POST /api/users/login ─────────────────────────
// Inloggen met e-mail + wachtwoord
//
// Verwacht in de body:
//   { "email": "jan@mail.com", "password": "geheim123" }
//
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail en wachtwoord zijn verplicht.' });
  }

  try {
    // Zoek de gebruiker op via e-mail
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'E-mail of wachtwoord is onjuist.' });
    }

    const user = result.rows[0];

    // Vergelijk het ingevoerde wachtwoord met de hash in de database
    const wachtwoordKlopt = await bcrypt.compare(password, user.password);
    if (!wachtwoordKlopt) {
      return res.status(401).json({ error: 'E-mail of wachtwoord is onjuist.' });
    }

    // Maak een nieuw token aan
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });

  } catch (err) {
    console.error('Fout bij inloggen:', err.message);
    res.status(500).json({ error: 'Er is iets misgegaan. Probeer opnieuw.' });
  }
});


module.exports = router;
