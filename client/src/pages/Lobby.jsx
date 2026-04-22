import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { connectSocket, disconnectSocket } from '../api/socket';
import './Lobby.css';

export default function Lobby() {
  const { code } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [players, setPlayers] = useState([]);
  const [match, setMatch] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState('Connecting...');

  useEffect(() => {
    const socket = connectSocket();

    socket.emit('room:join', { room_code: code });

    socket.on('room:state', (data) => {
      setMatch(data.match);
      setPlayers(data.players);
      setStatus(data.players.length >= 2 ? 'Both players ready!' : 'Waiting for opponent...');
    });

    socket.on('room:player_joined', (data) => {
      setPlayers(data.players);
      setStatus('Both players ready! Starting soon...');
    });

    socket.on('room:player_left', () => {
      setStatus('Opponent left the room');
      setPlayers(prev => prev.filter(p => p.id !== undefined));
    });

    socket.on('room:countdown', ({ count }) => {
      setCountdown(count);
    });

    socket.on('match:start', ({ match: m }) => {
      navigate(`/battle/${code}`, { state: { match: m } });
    });

    socket.on('error', ({ message }) => {
      setStatus(`Error: ${message}`);
    });

    return () => {
      socket.off('room:state');
      socket.off('room:player_joined');
      socket.off('room:player_left');
      socket.off('room:countdown');
      socket.off('match:start');
      socket.off('error');
    };
  }, [code, navigate]);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="lobby-page">
      <div className="lobby-card card">
        <div className="lobby-header">
          <h1>Battle Lobby</h1>
          <p className="text-muted">Share the room code with your opponent</p>
        </div>

        <div className="room-code-display" onClick={copyCode}>
          <span className="room-code mono">{code}</span>
          <span className="copy-hint">{copied ? '✓ Copied!' : 'Click to copy'}</span>
        </div>

        {match && (
          <div className="match-info">
            <span className={`badge badge-${match.difficulty}`}>{match.difficulty}</span>
            <span className="text-muted" style={{fontSize:'0.85rem'}}>
              {match.time_limit / 60} min · {match.title}
            </span>
          </div>
        )}

        <div className="players-section">
          <h3>Players ({players.length}/2)</h3>
          <div className="players-list">
            {players.map(p => (
              <div key={p.id} className="player-slot filled">
                <div className="avatar" style={{ background: p.avatar_color, width: 44, height: 44, fontSize: '1rem' }}>
                  {p.username[0].toUpperCase()}
                </div>
                <div className="player-info">
                  <span className="player-name">{p.username} {p.id === user?.id && <span className="you-tag">(you)</span>}</span>
                  <span className="player-elo mono">{p.elo} ELO</span>
                </div>
                <span className="player-ready">✓ Ready</span>
              </div>
            ))}
            {players.length < 2 && (
              <div className="player-slot empty">
                <div className="empty-avatar">?</div>
                <span className="text-muted">Waiting for opponent...</span>
                <div className="waiting-dots"><span/><span/><span/></div>
              </div>
            )}
          </div>
        </div>

        <div className="lobby-status">
          {countdown !== null ? (
            <div className="countdown-display">
              <span className="countdown-number">{countdown}</span>
              <p>Get ready!</p>
            </div>
          ) : (
            <p className={players.length >= 2 ? 'text-green' : 'text-muted'}>
              {status}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
