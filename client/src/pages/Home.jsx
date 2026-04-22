import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import './Home.css';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState(null); // 'create' | 'join'
  const [difficulty, setDifficulty] = useState('easy');
  const [timeLimit, setTimeLimit] = useState(1800);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!user) return navigate('/login');
    setLoading(true); setError('');
    try {
      const res = await api.post('/rooms/create', { difficulty, time_limit: timeLimit });
      navigate(`/lobby/${res.data.room_code}`);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to create room');
    } finally { setLoading(false); }
  };

  const handleJoin = async () => {
    if (!user) return navigate('/login');
    if (!joinCode.trim()) return setError('Enter a room code');
    setLoading(true); setError('');
    try {
      await api.post(`/rooms/join/${joinCode.trim().toUpperCase()}`);
      navigate(`/lobby/${joinCode.trim().toUpperCase()}`);
    } catch (e) {
      setError(e.response?.data?.error || 'Room not found');
    } finally { setLoading(false); }
  };

  return (
    <div className="home">
      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge mono">⚡ Real-time Coding Battles</div>
          <h1 className="hero-title">
            Challenge.<br/>
            <span>Code.</span><br/>
            Conquer.
          </h1>
          <p className="hero-desc">
            Race against opponents in real-time coding duels.
            Solve algorithmic problems faster to climb the ELO ladder.
          </p>
          {!user && (
            <div className="hero-btns">
              <Link to="/register" className="btn btn-primary">Get Started Free</Link>
              <Link to="/login" className="btn btn-ghost">Sign In</Link>
            </div>
          )}
        </div>
        <div className="hero-visual">
          <div className="code-window">
            <div className="code-window-header">
              <span className="dot red" /><span className="dot yellow" /><span className="dot green" />
              <span className="code-filename mono">twoSum.js</span>
            </div>
            <pre className="code-preview mono">{`function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
}`}</pre>
            <div className="code-result">
              <span className="text-green mono">✓ 4/4 test cases passed</span>
              <span className="result-badge">Winner!</span>
            </div>
          </div>
        </div>
      </section>

      {/* Action Panel */}
      {user && (
        <section className="action-panel">
          <div className="action-cards">
            <div
              className={`action-card ${mode === 'create' ? 'active' : ''}`}
              onClick={() => setMode(mode === 'create' ? null : 'create')}
            >
              <div className="action-icon">🎮</div>
              <h3>Create Room</h3>
              <p>Start a new battle and invite a friend</p>
            </div>
            <div
              className={`action-card ${mode === 'join' ? 'active' : ''}`}
              onClick={() => setMode(mode === 'join' ? null : 'join')}
            >
              <div className="action-icon">🔗</div>
              <h3>Join Room</h3>
              <p>Enter a room code to join a battle</p>
            </div>
          </div>

          {mode === 'create' && (
            <div className="action-form card">
              <div className="form-row">
                <div className="form-group">
                  <label>Difficulty</label>
                  <div className="difficulty-btns">
                    {['easy','medium','hard'].map(d => (
                      <button
                        key={d}
                        className={`diff-btn badge badge-${d} ${difficulty === d ? 'selected' : ''}`}
                        onClick={() => setDifficulty(d)}
                      >{d}</button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>Time Limit</label>
                  <select className="input" value={timeLimit} onChange={e => setTimeLimit(+e.target.value)}>
                    <option value={900}>15 minutes</option>
                    <option value={1800}>30 minutes</option>
                    <option value={3600}>60 minutes</option>
                  </select>
                </div>
              </div>
              {error && <p className="form-error">{error}</p>}
              <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
                {loading ? <span className="spinner" /> : '⚔ Create Battle Room'}
              </button>
            </div>
          )}

          {mode === 'join' && (
            <div className="action-form card">
              <div className="form-group">
                <label>Room Code</label>
                <input
                  className="input mono"
                  placeholder="Enter 6-digit code (e.g. A3BX7K)"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                />
              </div>
              {error && <p className="form-error">{error}</p>}
              <button className="btn btn-primary" onClick={handleJoin} disabled={loading}>
                {loading ? <span className="spinner" /> : '🔗 Join Room'}
              </button>
            </div>
          )}
        </section>
      )}

      {/* Features */}
      <section className="features">
        <h2 className="section-title">Why CodeDuel?</h2>
        <div className="features-grid">
          {[
            { icon: '⚡', title: 'Real-time Battles', desc: 'See your opponent\'s progress live as you both race to solve the problem' },
            { icon: '📊', title: 'ELO Ranking', desc: 'Win matches, gain ELO, climb the global leaderboard' },
            { icon: '🧠', title: 'Curated Problems', desc: 'Easy, medium, and hard algorithmic challenges from DSA fundamentals' },
            { icon: '💬', title: 'In-Match Chat', desc: 'Talk trash or be sportsmanlike — chat with your opponent mid-battle' },
          ].map(f => (
            <div key={f.title} className="feature-card card">
              <span className="feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
