const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('./db');
const { signToken } = require('./auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Vul alle velden in' });
  if (password.length < 6) return res.status(400).json({ error: 'Wachtwoord minimaal 6 tekens' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, hash]
    );
    const user = rows[0];
    await pool.query('INSERT INTO calendars (user_id, name) VALUES ($1,$2),($1,$3),($1,$4)',
      [user.id, 'Werk', 'Persoonlijk', 'Familie']);
    res.json({ token: signToken(user.id), user });
  } catch(e) {
    if (e.code === '23505') return res.status(400).json({ error: 'E-mailadres al in gebruik' });
    res.status(500).json({ error: 'Serverfout' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Vul e-mail en wachtwoord in' });
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Onbekend e-mailadres' });
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Verkeerd wachtwoord' });
    res.json({ token: signToken(user.id), user: { id: user.id, name: user.name, email: user.email } });
  } catch(e) {
    res.status(500).json({ error: 'Serverfout' });
  }
});

module.exports = router;
