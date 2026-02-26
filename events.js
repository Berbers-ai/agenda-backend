// ─────────────────────────────────────────────────
// routes/events.js — Events ophalen, aanmaken, bewerken, verwijderen
// ─────────────────────────────────────────────────
// Alle routes hier vereisen dat je bent ingelogd (requireLogin).
// req.user bevat de ingelogde gebruiker (gezet door auth.js).
// ─────────────────────────────────────────────────

const express        = require('express');
const { pool }       = require('../db');
const { requireLogin } = require('../auth');

const router = express.Router();

// Alle routes in dit bestand vereisen een geldig inlog-token
router.use(requireLogin);


// ── GET /api/events ───────────────────────────────
// Haal alle events op van de ingelogde gebruiker
//
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        e.id,
        e.title,
        e.date,
        e.start_time,
        e.end_time,
        e.location,
        e.description,
        c.name  AS calendar_name,
        c.color AS calendar_color
      FROM events e
      JOIN calendars c ON e.calendar_id = c.id
      WHERE c.user_id = $1
      ORDER BY e.date, e.start_time
    `, [req.user.id]);

    res.json(result.rows);
  } catch (err) {
    console.error('Fout bij ophalen events:', err.message);
    res.status(500).json({ error: 'Kon events niet ophalen.' });
  }
});


// ── POST /api/events ──────────────────────────────
// Maak een nieuw event aan
//
// Verwacht in de body:
// {
//   "title":       "Standup",
//   "date":        "2026-02-25",
//   "start_time":  9,
//   "end_time":    9.5,
//   "calendar_id": 1,
//   "location":    "Online",     (optioneel)
//   "description": "Dagelijks"   (optioneel)
// }
//
router.post('/', async (req, res) => {
  const { title, date, start_time, end_time, calendar_id, location, description } = req.body;

  if (!title || !date || start_time == null || end_time == null || !calendar_id) {
    return res.status(400).json({ error: 'Titel, datum, tijden en kalender zijn verplicht.' });
  }

  try {
    // Controleer of de kalender van déze gebruiker is
    const kalender = await pool.query(
      'SELECT id FROM calendars WHERE id = $1 AND user_id = $2',
      [calendar_id, req.user.id]
    );
    if (kalender.rows.length === 0) {
      return res.status(403).json({ error: 'Deze kalender bestaat niet of is niet van jou.' });
    }

    const result = await pool.query(`
      INSERT INTO events (calendar_id, title, date, start_time, end_time, location, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [calendar_id, title, date, start_time, end_time, location || null, description || null]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Fout bij aanmaken event:', err.message);
    res.status(500).json({ error: 'Kon event niet aanmaken.' });
  }
});


// ── PUT /api/events/:id ───────────────────────────
// Bewerk een bestaand event
//
router.put('/:id', async (req, res) => {
  const { title, date, start_time, end_time, location, description } = req.body;
  const eventId = req.params.id;

  try {
    // Controleer of dit event van de ingelogde gebruiker is
    const controle = await pool.query(`
      SELECT e.id FROM events e
      JOIN calendars c ON e.calendar_id = c.id
      WHERE e.id = $1 AND c.user_id = $2
    `, [eventId, req.user.id]);

    if (controle.rows.length === 0) {
      return res.status(403).json({ error: 'Dit event bestaat niet of is niet van jou.' });
    }

    const result = await pool.query(`
      UPDATE events
      SET title = $1, date = $2, start_time = $3, end_time = $4,
          location = $5, description = $6
      WHERE id = $7
      RETURNING *
    `, [title, date, start_time, end_time, location || null, description || null, eventId]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Fout bij bewerken event:', err.message);
    res.status(500).json({ error: 'Kon event niet bewerken.' });
  }
});


// ── DELETE /api/events/:id ────────────────────────
// Verwijder een event
//
router.delete('/:id', async (req, res) => {
  const eventId = req.params.id;

  try {
    // Controleer eigenaarschap
    const controle = await pool.query(`
      SELECT e.id FROM events e
      JOIN calendars c ON e.calendar_id = c.id
      WHERE e.id = $1 AND c.user_id = $2
    `, [eventId, req.user.id]);

    if (controle.rows.length === 0) {
      return res.status(403).json({ error: 'Dit event bestaat niet of is niet van jou.' });
    }

    await pool.query('DELETE FROM events WHERE id = $1', [eventId]);

    res.json({ message: 'Event verwijderd.' });
  } catch (err) {
    console.error('Fout bij verwijderen event:', err.message);
    res.status(500).json({ error: 'Kon event niet verwijderen.' });
  }
});


// ── GET /api/events/calendars ─────────────────────
// Haal alle kalenders op van de ingelogde gebruiker
//
router.get('/calendars', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM calendars WHERE user_id = $1 ORDER BY id',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Kon kalenders niet ophalen.' });
  }
});


module.exports = router;
