// ============================================================
// routeAuth.js — POST /api/auth/signup  &  POST /api/auth/login
// ============================================================

const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db      = require('./db.js');
require('dotenv').config();

const router = express.Router();

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
}

// ---- POST /api/auth/signup ----
router.post('/signup',
  [
    body('name').trim().notEmpty().withMessage('Name is required.'),
    body('email').isEmail().withMessage('Valid email is required.').normalizeEmail(),
    body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters.'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { name, email, username, password } = req.body;
    try {
      const [existing] = await db.query(
        'SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1', [email, username]
      );
      if (existing.length) return res.status(409).json({ error: 'Email or username already registered.' });

      const hash = await bcrypt.hash(password, 10);
      await db.query('INSERT INTO users (name, email, username, password) VALUES (?,?,?,?)', [name, email, username, hash]);
      return res.status(201).json({ message: 'Account created. Please log in.' });
    } catch (err) {
      console.error('Signup error:', err);
      return res.status(500).json({ error: 'Server error. Try again.' });
    }
  }
);

// ---- POST /api/auth/login ----
router.post('/login',
  [
    body('email').isEmail().withMessage('Valid email is required.').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { email, password } = req.body;
    try {
      // Admin check — hardcoded, not in DB
      if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
        const payload = { id: 0, name: 'System Admin', email, username: 'admin', isAdmin: true };
        return res.json({ token: signToken(payload), user: payload });
      }

      const [rows] = await db.query(
        'SELECT id, name, email, username, password FROM users WHERE email = ? LIMIT 1', [email]
      );
      if (!rows.length) return res.status(401).json({ error: 'Invalid email or password.' });

      const match = await bcrypt.compare(password, rows[0].password);
      if (!match)  return res.status(401).json({ error: 'Invalid email or password.' });

      const { password: _pw, ...user } = rows[0];
      const payload = { ...user, isAdmin: false };
      return res.json({ token: signToken(payload), user: payload });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Server error. Try again.' });
    }
  }
);

module.exports = router;
