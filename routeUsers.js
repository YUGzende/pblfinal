// ============================================================
// routeUsers.js — GET /api/users/me
// ============================================================

const express = require('express');
const db      = require('./db.js');
const { requireAuth } = require('./authMiddleware.js');

const router = express.Router();

router.get('/me', requireAuth, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, name, email, username, created_at FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );
    if (!users.length) return res.status(404).json({ error: 'User not found.' });

    const [[counts]] = await db.query(
      `SELECT
         COUNT(*)                 AS total,
         SUM(result='Approved')   AS approved,
         SUM(result='Rejected')   AS rejected
       FROM predictions WHERE user_id = ?`,
      [req.user.id]
    );
    return res.json({ ...users[0], counts });
  } catch (err) {
    console.error('Profile error:', err);
    return res.status(500).json({ error: 'Could not fetch profile.' });
  }
});

module.exports = router;
