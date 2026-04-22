const express = require('express');
const { getPool } = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

// GET /api/leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const [rows] = await getPool().query(
      `SELECT id, username, elo, wins, losses, avatar_color,
              ROUND(wins / NULLIF(wins + losses, 0) * 100, 1) as win_rate
       FROM users
       ORDER BY elo DESC
       LIMIT 50`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leaderboard.' });
  }
});

// GET /api/users/me  — current user's full profile
router.get('/users/me', auth, async (req, res) => {
  try {
    const [rows] = await getPool().query(
      'SELECT id, username, email, elo, wins, losses, avatar_color, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found.' });

    const [matches] = await getPool().query(
      `SELECT m.id, m.room_code, m.difficulty, m.ended_at,
              p.title as problem_title,
              mp.tests_passed, mp.tests_total, mp.elo_change,
              CASE WHEN m.winner_id = ? THEN 'win' ELSE 'loss' END as result
       FROM match_players mp
       JOIN matches m ON mp.match_id = m.id
       JOIN problems p ON m.problem_id = p.id
       WHERE mp.user_id = ? AND m.status = 'finished'
       ORDER BY m.ended_at DESC
       LIMIT 10`,
      [req.user.id, req.user.id]
    );

    res.json({ ...rows[0], recent_matches: matches });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

// GET /api/users/:username  — public profile
router.get('/users/:username', async (req, res) => {
  try {
    const [rows] = await getPool().query(
      'SELECT id, username, elo, wins, losses, avatar_color, created_at FROM users WHERE username = ?',
      [req.params.username]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found.' });

    const user = rows[0];
    const [matches] = await getPool().query(
      `SELECT m.id, m.difficulty, m.ended_at, p.title as problem_title,
              mp.tests_passed, mp.tests_total, mp.elo_change,
              CASE WHEN m.winner_id = ? THEN 'win' ELSE 'loss' END as result
       FROM match_players mp
       JOIN matches m ON mp.match_id = m.id
       JOIN problems p ON m.problem_id = p.id
       WHERE mp.user_id = ? AND m.status = 'finished'
       ORDER BY m.ended_at DESC LIMIT 10`,
      [user.id, user.id]
    );

    res.json({ ...user, recent_matches: matches });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

module.exports = router;
