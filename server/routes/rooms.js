const express = require('express');
const { getPool } = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// POST /api/rooms/create
router.post('/create', auth, async (req, res) => {
  const { difficulty = 'easy', time_limit = 1800 } = req.body;

  try {
    let room_code, tries = 0;
    do {
      room_code = generateRoomCode();
      const [existing] = await getPool().query(
        "SELECT id FROM matches WHERE room_code = ? AND status != 'finished'",
        [room_code]
      );
      if (existing.length === 0) break;
      tries++;
    } while (tries < 10);

    // Pick a random problem by difficulty
    const [problems] = await getPool().query(
      'SELECT id FROM problems WHERE difficulty = ? ORDER BY RAND() LIMIT 1',
      [difficulty]
    );
    if (problems.length === 0)
      return res.status(404).json({ error: 'No problems found for this difficulty.' });

    const problem_id = problems[0].id;

    const [result] = await getPool().query(
      'INSERT INTO matches (room_code, problem_id, difficulty, time_limit) VALUES (?, ?, ?, ?)',
      [room_code, problem_id, difficulty, time_limit]
    );

    // Add creator as first player
    await getPool().query(
      'INSERT INTO match_players (match_id, user_id) VALUES (?, ?)',
      [result.insertId, req.user.id]
    );

    res.status(201).json({ room_code, match_id: result.insertId, difficulty });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create room.' });
  }
});

// POST /api/rooms/join/:code
router.post('/join/:code', auth, async (req, res) => {
  const { code } = req.params;

  try {
    const [matches] = await getPool().query(
      "SELECT * FROM matches WHERE room_code = ? AND status = 'waiting'",
      [code.toUpperCase()]
    );
    if (matches.length === 0)
      return res.status(404).json({ error: 'Room not found or already started.' });

    const match = matches[0];

    // Check if already in room
    const [existing] = await getPool().query(
      'SELECT * FROM match_players WHERE match_id = ? AND user_id = ?',
      [match.id, req.user.id]
    );
    if (existing.length > 0)
      return res.json({ room_code: code, match_id: match.id, already_joined: true });

    // Count players
    const [players] = await getPool().query(
      'SELECT COUNT(*) as cnt FROM match_players WHERE match_id = ?',
      [match.id]
    );
    if (players[0].cnt >= 2)
      return res.status(400).json({ error: 'Room is full.' });

    await getPool().query(
      'INSERT INTO match_players (match_id, user_id) VALUES (?, ?)',
      [match.id, req.user.id]
    );

    res.json({ room_code: code, match_id: match.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to join room.' });
  }
});

// GET /api/rooms/:code  — get room info + problem
router.get('/:code', auth, async (req, res) => {
  const { code } = req.params;
  try {
    const [matches] = await getPool().query(
      `SELECT m.*, p.title, p.description, p.difficulty, p.examples,
              p.test_cases, p.starter_code_js, p.starter_code_python
       FROM matches m
       JOIN problems p ON m.problem_id = p.id
       WHERE m.room_code = ?`,
      [code.toUpperCase()]
    );
    if (matches.length === 0)
      return res.status(404).json({ error: 'Room not found.' });

    const match = matches[0];
    match.examples = JSON.parse(match.examples);
    match.test_cases = JSON.parse(match.test_cases);

    const [players] = await getPool().query(
      `SELECT u.id, u.username, u.elo, u.avatar_color,
              mp.tests_passed, mp.tests_total, mp.finished_at
       FROM match_players mp
       JOIN users u ON mp.user_id = u.id
       WHERE mp.match_id = ?`,
      [match.id]
    );

    res.json({ match, players });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get room info.' });
  }
});

module.exports = router;
