import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import './Leaderboard.css';

const RANK_COLORS = ['#f5c842', '#b0b8c4', '#cd7f32'];

export default function Leaderboard() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/leaderboard').then(res => {
      setPlayers(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <div className="lb-header">
        <h1>🏆 Leaderboard</h1>
        <p className="text-muted">Top 50 CodeDuel champions ranked by ELO</p>
      </div>

      {loading ? (
        <div style={{display:'flex',justifyContent:'center',padding:'3rem'}}><span className="spinner" /></div>
      ) : (
        <div className="lb-table-wrap card">
          <table className="lb-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>ELO</th>
                <th>W</th>
                <th>L</th>
                <th>Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, i) => (
                <tr key={p.id} className={i < 3 ? 'top-rank' : ''}>
                  <td className="rank-cell">
                    {i < 3
                      ? <span className="rank-medal" style={{color: RANK_COLORS[i]}}>
                          {['🥇','🥈','🥉'][i]}
                        </span>
                      : <span className="mono text-muted">{i + 1}</span>
                    }
                  </td>
                  <td>
                    <div className="lb-player">
                      <div className="avatar" style={{ background: p.avatar_color }}>
                        {p.username[0].toUpperCase()}
                      </div>
                      <span className="lb-username">{p.username}</span>
                    </div>
                  </td>
                  <td><span className="mono elo-val">{p.elo}</span></td>
                  <td><span className="text-green mono">{p.wins}</span></td>
                  <td><span className="text-red mono">{p.losses}</span></td>
                  <td>
                    <div className="winrate-cell">
                      <div className="winrate-bar">
                        <div className="winrate-fill" style={{ width: `${p.win_rate || 0}%` }} />
                      </div>
                      <span className="mono" style={{fontSize:'0.78rem',color:'var(--muted)'}}>{p.win_rate || 0}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {players.length === 0 && (
                <tr><td colSpan={6} style={{textAlign:'center',color:'var(--muted)',padding:'2rem'}}>No players yet. Be the first!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
