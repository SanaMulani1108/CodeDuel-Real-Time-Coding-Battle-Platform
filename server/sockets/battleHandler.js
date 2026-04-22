const jwt = require('jsonwebtoken');
const { getPool } = require('../db');

// roomCode -> { players: [{socketId, userId, username, avatar_color}], matchId, timer }
const activeRooms = new Map();

module.exports = function setupSockets(io) {
  // Auth middleware for sockets
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 ${socket.user.username} connected [${socket.id}]`);

    // ── JOIN ROOM ──────────────────────────────────────────
    socket.on('room:join', async ({ room_code }) => {
      const code = room_code.toUpperCase();

      try {
        const [matches] = await getPool().query(
          `SELECT m.id, m.status, m.time_limit, m.problem_id,
                  p.title, p.description, p.difficulty, p.examples,
                  p.test_cases, p.starter_code_js, p.starter_code_python
           FROM matches m JOIN problems p ON m.problem_id = p.id
           WHERE m.room_code = ?`,
          [code]
        );
        if (!matches.length) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        const match = matches[0];

        socket.join(code);
        socket.roomCode = code;

        if (!activeRooms.has(code)) {
          activeRooms.set(code, { players: [], matchId: match.id, timer: null });
        }

        const room = activeRooms.get(code);

        // Add player if not already in room
        const alreadyIn = room.players.find(p => p.userId === socket.user.id);
        if (!alreadyIn) {
          room.players.push({
            socketId: socket.id,
            userId: socket.user.id,
            username: socket.user.username,
            testsProgress: 0,
            finished: false,
          });
        } else {
          alreadyIn.socketId = socket.id; // Reconnect
        }

        // Fetch all player details from DB
        const [dbPlayers] = await getPool().query(
          `SELECT u.id, u.username, u.elo, u.avatar_color
           FROM match_players mp JOIN users u ON mp.user_id = u.id
           WHERE mp.match_id = ?`,
          [match.id]
        );

        // Emit room state to this player
        socket.emit('room:state', {
          match: {
            ...match,
            examples: JSON.parse(match.examples),
            test_cases: JSON.parse(match.test_cases),
          },
          players: dbPlayers,
          room_players: room.players.length,
        });

        // Notify others in room
        socket.to(code).emit('room:player_joined', {
          userId: socket.user.id,
          username: socket.user.username,
          players: dbPlayers,
        });

        // If 2 players and match is waiting → start
        if (room.players.length >= 2 && match.status === 'waiting') {
          await getPool().query(
            "UPDATE matches SET status = 'active', started_at = NOW() WHERE id = ?",
            [match.id]
          );

          // 3-second countdown then start
          let countdown = 3;
          const countdownInterval = setInterval(() => {
            io.to(code).emit('room:countdown', { count: countdown });
            countdown--;
            if (countdown < 0) {
              clearInterval(countdownInterval);
              io.to(code).emit('match:start', {
                match: {
                  ...match,
                  examples: JSON.parse(match.examples),
                  test_cases: JSON.parse(match.test_cases),
                },
                time_limit: match.time_limit,
              });

              // Start server-side timer
              startMatchTimer(io, code, match.id, match.time_limit, room);
            }
          }, 1000);
        }
      } catch (err) {
        console.error('room:join error', err);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // ── CODE PROGRESS ──────────────────────────────────────
    // Broadcast test progress to opponent (called after each run)
    socket.on('code:progress', ({ room_code, tests_passed, tests_total }) => {
      const code = room_code.toUpperCase();
      const room = activeRooms.get(code);
      if (room) {
        const player = room.players.find(p => p.userId === socket.user.id);
        if (player) player.testsProgress = tests_passed;
      }
      // Tell opponent about this player's progress
      socket.to(code).emit('opponent:progress', {
        userId: socket.user.id,
        username: socket.user.username,
        tests_passed,
        tests_total,
        percentage: tests_total ? Math.round((tests_passed / tests_total) * 100) : 0,
      });
    });

    // ── MATCH WON ──────────────────────────────────────────
    socket.on('match:won', async ({ room_code, match_id }) => {
      const code = room_code.toUpperCase();
      const room = activeRooms.get(code);

      try {
        const [match] = await getPool().query(
          'SELECT winner_id FROM matches WHERE id = ?',
          [match_id]
        );

        if (match[0]?.winner_id) return; // Already won

        // Get player ELO changes
        const [players] = await getPool().query(
          `SELECT u.username, u.elo, mp.elo_change, u.avatar_color
           FROM match_players mp JOIN users u ON mp.user_id = u.id
           WHERE mp.match_id = ?`,
          [match_id]
        );

        io.to(code).emit('match:finished', {
          winner: { userId: socket.user.id, username: socket.user.username },
          players,
        });

        // Clear timer
        if (room?.timer) clearInterval(room.timer);
      } catch (err) {
        console.error('match:won error', err);
      }
    });

    // ── CHAT ───────────────────────────────────────────────
    socket.on('chat:message', ({ room_code, message }) => {
      if (!message || message.length > 200) return;
      io.to(room_code.toUpperCase()).emit('chat:message', {
        userId: socket.user.id,
        username: socket.user.username,
        message: message.trim(),
        timestamp: new Date().toISOString(),
      });
    });

    // ── DISCONNECT ─────────────────────────────────────────
    socket.on('disconnect', () => {
      const code = socket.roomCode;
      if (code && activeRooms.has(code)) {
        const room = activeRooms.get(code);
        const idx = room.players.findIndex(p => p.socketId === socket.id);
        if (idx !== -1) room.players.splice(idx, 1);

        socket.to(code).emit('room:player_left', {
          userId: socket.user.id,
          username: socket.user.username,
        });

        if (room.players.length === 0) {
          if (room.timer) clearInterval(room.timer);
          activeRooms.delete(code);
        }
      }
      console.log(`❌ ${socket.user.username} disconnected`);
    });
  });
};

function startMatchTimer(io, room_code, match_id, time_limit, room) {
  let remaining = time_limit;

  room.timer = setInterval(async () => {
    remaining--;
    io.to(room_code).emit('match:timer', { remaining });

    if (remaining <= 0) {
      clearInterval(room.timer);
      await getPool().query(
        "UPDATE matches SET status = 'finished', ended_at = NOW() WHERE id = ? AND status = 'active'",
        [match_id]
      );
      io.to(room_code).emit('match:timeout', { message: "Time's up! Match ended." });
    }
  }, 1000);
}
