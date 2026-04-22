# ⚔ CodeDuel — Real-Time Coding Battle Platform

A full-stack competitive coding platform where users race to solve algorithmic problems in real-time.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js, React Router, Monaco Editor |
| Styling | CSS3 (custom dark theme) |
| Backend | Node.js, Express.js |
| Real-time | Socket.io |
| Database | MySQL (mysql2) |
| Auth | JWT + bcryptjs |
| Code Execution | Judge0 API (via RapidAPI) |

---

## Project Structure

```
codeduel/
├── client/                        ← React frontend
│   ├── public/index.html
│   └── src/
│       ├── api/
│       │   ├── axios.js           ← Axios instance with JWT interceptor
│       │   └── socket.js          ← Socket.io singleton
│       ├── context/
│       │   └── AuthContext.jsx    ← Global auth state
│       ├── components/
│       │   └── Navbar.jsx
│       ├── pages/
│       │   ├── Home.jsx           ← Landing + Create/Join room
│       │   ├── Auth.jsx           ← Login + Register
│       │   ├── Lobby.jsx          ← Waiting room (Socket.io)
│       │   ├── Battle.jsx         ← Monaco Editor + live battle
│       │   ├── Leaderboard.jsx    ← Top 50 players
│       │   └── Dashboard.jsx      ← User stats + match history
│       ├── App.jsx                ← Routes
│       └── index.css              ← Global styles
│
└── server/                        ← Node.js + Express backend
    ├── routes/
    │   ├── auth.js                ← POST /register, /login
    │   ├── rooms.js               ← POST /create, /join, GET /:code
    │   ├── submit.js              ← POST /submit (Judge0 integration)
    │   └── users.js               ← GET /leaderboard, /users/:username
    ├── middleware/
    │   └── auth.js                ← JWT verification middleware
    ├── sockets/
    │   └── battleHandler.js       ← All Socket.io events
    ├── services/
    │   └── judge0.js              ← Code execution wrapper
    ├── db.js                      ← MySQL pool + DB init + seeding
    └── index.js                   ← Express server entry point
```

---

## Setup Instructions

### Prerequisites
- Node.js v18+
- MySQL 8.0+
- RapidAPI account (for Judge0 free tier)

### 1. Clone & Install

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 2. Configure Environment

```bash
cd server
cp .env.example .env
```

Edit `.env`:
```env
PORT=5000
CLIENT_URL=http://localhost:3000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=codeduel

JWT_SECRET=change_this_to_a_long_random_string

# Get free key at: https://rapidapi.com/judge0-official/api/judge0-ce
JUDGE0_API_KEY=your_rapidapi_key
JUDGE0_BASE_URL=https://judge0-ce.p.rapidapi.com
```

### 3. Start the App

```bash
# Terminal 1 — Backend
cd server
npm run dev

# Terminal 2 — Frontend
cd client
npm start
```

Visit: **http://localhost:3000**

The database and all tables are auto-created on first run. Problems are seeded automatically.

---

## API Endpoints

```
POST   /api/auth/register          Create account
POST   /api/auth/login             Login, get JWT

POST   /api/rooms/create           Create battle room
POST   /api/rooms/join/:code       Join room by code
GET    /api/rooms/:code            Get room + problem details

POST   /api/submit                 Run code against test cases (Judge0)

GET    /api/leaderboard            Top 50 players
GET    /api/users/me               Own profile + match history (auth)
GET    /api/users/:username        Public user profile
```

## Socket.io Events

```
CLIENT → SERVER
  room:join         Join a room
  code:progress     Broadcast test pass % to opponent
  match:won         Declare self as winner
  chat:message      Send chat message

SERVER → CLIENT
  room:state        Full room info on join
  room:player_joined New player arrived
  room:countdown    3-2-1 countdown ticks
  match:start       Battle begins
  match:timer       Remaining seconds (every 1s)
  opponent:progress Opponent's test pass %
  match:finished    Winner declared + ELO changes
  match:timeout     Time ran out
  chat:message      New chat message
```

---

## Features

- ✅ JWT Authentication (register / login / protected routes)
- ✅ Full CRUD — rooms, backlog, players, match history
- ✅ Real-time battles via Socket.io
- ✅ Monaco Editor (VS Code in browser) with JS/Python support
- ✅ Code execution via Judge0 API (real test case evaluation)
- ✅ Live opponent progress bar
- ✅ ELO ranking system (+25/-25 per match)
- ✅ In-match chat
- ✅ Leaderboard (top 50)
- ✅ Dashboard with stats and match history
- ✅ 5 seeded problems (Easy/Medium)

---

## Deployment

- **Backend**: [Railway](https://railway.app) — free Node.js + MySQL hosting
- **Frontend**: [Vercel](https://vercel.com) — free React hosting
- Update `CLIENT_URL` in backend `.env` and `proxy` in `client/package.json` for production URLs

---

## Resume Talking Points

- **JWT Auth flow**: Stateless auth with bcrypt hashing and token-based protected routes
- **WebSockets**: Real-time bidirectional communication for live battle sync
- **REST API design**: RESTful Express routes with auth middleware
- **SQL schema**: Normalized relational DB with foreign keys, joins, and aggregations
- **Third-party API**: Judge0 integration for sandboxed code execution
- **ELO algorithm**: Dynamic ranking system based on match outcomes
- **React architecture**: Context API for global state, React Router for SPA navigation

Built with ❤ by Sana Mulani
