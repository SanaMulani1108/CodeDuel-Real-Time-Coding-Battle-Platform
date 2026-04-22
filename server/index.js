require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { initDB } = require('./db');

const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const submitRoute = require('./routes/submit');
const userRoutes = require('./routes/users');
const setupSockets = require('./sockets/battleHandler');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/submit', submitRoute);
app.use('/api', userRoutes); // /api/leaderboard, /api/users/:username

// 404 fallback
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Socket.io
setupSockets(io);

// Start
const PORT = process.env.PORT || 5000;

initDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`🚀 CodeDuel server running on http://localhost:${PORT}`);
      console.log(`🔌 Socket.io ready`);
    });
  })
  .catch(err => {
    console.error('❌ Database initialization failed:', err);
    process.exit(1);
  });
