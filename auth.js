const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'dev-secret';

function signToken(userId) {
  return jwt.sign({ userId }, SECRET, { expiresIn: '7d' });
}

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Niet ingelogd' });
  try {
    req.user = jwt.verify(auth.slice(7), SECRET);
    next();
  } catch(e) {
    res.status(401).json({ error: 'Ongeldige sessie' });
  }
}

module.exports = { signToken, requireAuth };
