# ⚔ CodeDuel — Real-Time Coding Battle Platform

A full-stack competitive coding platform where users race to solve algorithmic problems in real-time.

---

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

### Prerequisites
- Node.js v18+
- MySQL 8.0+
- RapidAPI account 

### 1. Clone & Install

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 2. Start the App

```bash
# Terminal 1 — Backend
cd server
npm run dev

# Terminal 2 — Frontend
cd client
npm start
```


## API Endpoints


```
POST   /api/auth/register          Create account
POST   /api/auth/login             Login, get JWT

POST   /api/rooms/create           Create battle room
POST   /api/rooms/join/:code       Join room by code
GET    /api/rooms/:code            Get room + problem details

POST   /api/submit                 Run code against test cases 

GET    /api/leaderboard            Top 50 players
GET    /api/users/me               Own profile + match history 
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


<img width="1362" height="645" alt="image" src="https://github.com/user-attachments/assets/8fdd5164-0650-4fcb-8837-ee75563ea6f3" />
<img width="1366" height="585" alt="image" src="https://github.com/user-attachments/assets/93b0e478-f41e-4e72-9281-485673553080" />
<img width="1365" height="642" alt="image" src="https://github.com/user-attachments/assets/099dd514-fa1e-4a1f-b8b1-a7793e383326" />
<img width="1362" height="641" alt="image" src="https://github.com/user-attachments/assets/c35e4916-6b50-466a-b7c3-b242a01da2fc" />
<img width="1363" height="649" alt="image" src="https://github.com/user-attachments/assets/5ce70b5b-fad5-466e-9670-0c33419ac061" />





