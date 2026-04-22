import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import './Dashboard.css';

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/me').then(res => {
      setProfile(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><span className="spinner" /></div>;
  if (!profile) return <div className="page"><p className="text-muted">Could not load profile.</p></div>;

  const totalGames = profile.wins + profile.losses;
  const winRate = totalGames > 0 ? Math.round((profile.wins / totalGames) * 100) : 0;

  return (
    <div className="page">
      {/* Profile Header */}
      <div className="dash-profile card">
        <div className="avatar" style={{ background: profile.avatar_color, width: 64, height: 64, fontSize: '1.5rem' }}>
          {profile.username[0].toUpperCase()}
        </div>
        <div className="dash-profile-info">
          <h1>{profile.username}</h1>
          <p className="text-muted mono">{profile.email}</p>
          <p className="text-muted" style={{fontSize:'0.8rem'}}>Joined {new Date(profile.created_at).toLocaleDateString('en-IN', {year:'numeric',month:'long'})}</p>
        </div>
        <div className="dash-elo">
          <span className="elo-big mono">{profile.elo}</span>
          <span className="text-muted" style={{fontSize:'0.8rem'}}>ELO Rating</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {[
          { label: 'Total Duels', value: totalGames, color: 'var(--accent2)' },
          { label: 'Wins', value: profile.wins, color: 'var(--green)' },
          { label: 'Losses', value: profile.losses, color: 'var(--red)' },
          { label: 'Win Rate', value: `${winRate}%`, color: 'var(--yellow)' },
        ].map(s => (
          <div key={s.label} className="stat-box card">
            <span className="stat-num mono" style={{color: s.color}}>{s.value}</span>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Win Rate Bar */}
      <div className="winrate-section card">
        <div className="winrate-label">
          <span>Win Rate Progress</span>
          <span className="mono" style={{color:'var(--accent2)'}}>{winRate}%</span>
        </div>
        <div className="winrate-track">
          <div className="winrate-bar-fill" style={{width:`${winRate}%`}} />
        </div>
        <div className="winrate-sub">
          <span className="text-green">▲ {profile.wins} wins</span>
          <span className="text-red">▼ {profile.losses} losses</span>
        </div>
      </div>

      {/* Recent Matches */}
      <div className="recent-section">
        <h2>Recent Matches</h2>
        {profile.recent_matches?.length === 0 && (
          <div className="card" style={{padding:'2rem',textAlign:'center',color:'var(--muted)'}}>
            No matches yet. Start a battle to build your history!
          </div>
        )}
        <div className="matches-list">
          {profile.recent_matches?.map(m => (
            <div key={m.id} className={`match-row card ${m.result}`}>
              <div className={`match-result-badge ${m.result}`}>
                {m.result === 'win' ? 'W' : 'L'}
              </div>
              <div className="match-info">
                <span className="match-problem">{m.problem_title}</span>
                <span className={`badge badge-${m.difficulty}`}>{m.difficulty}</span>
              </div>
              <div className="match-stats">
                <span className="mono" style={{fontSize:'0.8rem',color:'var(--muted)'}}>
                  {m.tests_passed}/{m.tests_total} tests
                </span>
                <span className={`mono elo-change ${m.elo_change > 0 ? 'text-green' : 'text-red'}`}>
                  {m.elo_change > 0 ? '+' : ''}{m.elo_change} ELO
                </span>
                <span className="text-muted" style={{fontSize:'0.75rem'}}>
                  {m.ended_at ? new Date(m.ended_at).toLocaleDateString() : '—'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
