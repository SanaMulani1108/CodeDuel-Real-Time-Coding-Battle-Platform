const express = require('express');
const { getPool } = require('../db');
const auth = require('../middleware/auth');
const { runTestCases } = require('../services/judge0');
const router = express.Router();

// POST /api/submit
router.post('/', auth, async (req, res) => {
  const { match_id, code, language = 'javascript' } = req.body;

  if (!match_id || !code)
    return res.status(400).json({ error: 'match_id and code are required.' });

  try {
    // Get match + problem
    const [matches] = await getPool().query(
      `SELECT m.*, p.test_cases
       FROM matches m JOIN problems p ON m.problem_id = p.id
       WHERE m.id = ? AND m.status = 'active'`,
      [match_id]
    );
    if (matches.length === 0)
      return res.status(404).json({ error: 'Match not found or not active.' });

    const match = matches[0];
    const testCases = JSON.parse(match.test_cases);

    // Verify player is in match
    const [playerCheck] = await getPool().query(
      'SELECT * FROM match_players WHERE match_id = ? AND user_id = ?',
      [match_id, req.user.id]
    );
    if (playerCheck.length === 0)
      return res.status(403).json({ error: 'You are not in this match.' });

    // Run test cases
    const results = await runTestCases(code, language, testCases);
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const allPassed = passed === total;

    // Update player stats
    await getPool().query(
      `UPDATE match_players
       SET submitted_code = ?, language = ?, tests_passed = ?, tests_total = ?,
           finished_at = ${allPassed ? 'NOW()' : 'finished_at'}
       WHERE match_id = ? AND user_id = ?`,
      [code, language, passed, total, match_id, req.user.id]
    );

    // If all passed — declare winner
    if (allPassed) {
      const [alreadyWon] = await getPool().query(
        "SELECT winner_id FROM matches WHERE id = ? AND winner_id IS NOT NULL",
        [match_id]
      );

      if (alreadyWon.length === 0) {
        // This player is the first to pass all — they win
        await getPool().query(
          "UPDATE matches SET winner_id = ?, status = 'finished', ended_at = NOW() WHERE id = ?",
          [req.user.id, match_id]
        );

        // Update ELO
        const [players] = await getPool().query(
          'SELECT user_id FROM match_players WHERE match_id = ?',
          [match_id]
        );
        const loserId = players.find(p => p.user_id !== req.user.id)?.user_id;

        const eloGain = 25;
        await getPool().query('UPDATE users SET elo = elo + ?, wins = wins + 1 WHERE id = ?', [eloGain, req.user.id]);
        await getPool().query('UPDATE match_players SET elo_change = ? WHERE match_id = ? AND user_id = ?', [eloGain, match_id, req.user.id]);

        if (loserId) {
          await getPool().query('UPDATE users SET elo = GREATEST(0, elo - ?), losses = losses + 1 WHERE id = ?', [eloGain, loserId]);
          await getPool().query('UPDATE match_players SET elo_change = ? WHERE match_id = ? AND user_id = ?', [-eloGain, match_id, loserId]);
        }
      }
    }

    res.json({
      results,
      passed,
      total,
      all_passed: allPassed,
      percentage: Math.round((passed / total) * 100),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Submission failed. Check Judge0 API key.' });
  }
});

module.exports = router;
