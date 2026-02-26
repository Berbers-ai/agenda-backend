const express = require('express');
const { pool } = require('./db');
const { requireAuth } = require('./auth');

const router = express.Router();

router.get('/calendars', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM calendars WHERE user_id=$1 ORDER BY id', [req.user.userId]);
  res.json(rows);
});

router.get('/', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT e.* FROM events e
     JOIN calendars c ON e.calendar_id = c.id
     WHERE c.user_id = $1 ORDER BY e.date, e.start_time`,
    [req.user.userId]
  );
  res.json(rows);
});

router.post('/', requireAuth, async (req, res) => {
  const { calendar_id, title, date, start_time, end_time, location, description } = req.body;
  const cal = await pool.query('SELECT id FROM calendars WHERE id=$1 AND user_id=$2', [calendar_id, req.user.userId]);
  if (!cal.rows.length) return res.status(403).json({ error: 'Geen toegang' });
  const { rows } = await pool.query(
    'INSERT INTO events (calendar_id,title,date,start_time,end_time,location,description) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
    [calendar_id, title, date, start_time, end_time, location||null, description||null]
  );
  res.json(rows[0]);
});

router.put('/:id', requireAuth, async (req, res) => {
  const { title, date, start_time, end_time, location, description, calendar_id } = req.body;
  const { rows } = await pool.query(
    `UPDATE events SET title=$1,date=$2,start_time=$3,end_time=$4,location=$5,description=$6,calendar_id=$7
     WHERE id=$8 AND calendar_id IN (SELECT id FROM calendars WHERE user_id=$9) RETURNING *`,
    [title, date, start_time, end_time, location||null, description||null, calendar_id, req.params.id, req.user.userId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Niet gevonden' });
  res.json(rows[0]);
});

router.delete('/:id', requireAuth, async (req, res) => {
  await pool.query(
    `DELETE FROM events WHERE id=$1 AND calendar_id IN (SELECT id FROM calendars WHERE user_id=$2)`,
    [req.params.id, req.user.userId]
  );
  res.json({ ok: true });
});

module.exports = router;
