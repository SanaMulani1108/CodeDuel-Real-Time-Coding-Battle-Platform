import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useAuth } from '../context/AuthContext';
import { connectSocket } from '../api/socket';
import api from '../api/axios';
import './Battle.css';

const LANGUAGE_STARTERS = {
  javascript: (code) => code || 'function solution() {\n  // your code here\n}',
  python: (code) => code || 'def solution():\n    # your code here\n    pass',
};

function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function Battle() {
  const { code: roomCode } = useParams();
  const { state } = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [match, setMatch] = useState(state?.match || null);
  const [language, setLanguage] = useState('javascript');
  const [editorCode, setEditorCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [running, setRunning] = useState(false);
  const [opponentProgress, setOpponentProgress] = useState({ username: '...', percentage: 0, tests_passed: 0, tests_total: 0 });
  const [myProgress, setMyProgress] = useState(0);
  const [winner, setWinner] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [activeTab, setActiveTab] = useState('problem'); // 'problem' | 'results' | 'chat'
  const chatEndRef = useRef(null);
  const socketRef = useRef(null);

  // Init match from state or fetch
  useEffect(() => {
    if (!match) {
      api.get(`/rooms/${roomCode}`).then(res => {
        setMatch(res.data.match);
        setTimeLeft(res.data.match.time_limit);
      });
    } else {
      setTimeLeft(match.time_limit);
    }
  }, [roomCode, match]);

  // Set starter code when match/language changes
  useEffect(() => {
    if (!match) return;
    const starter = language === 'javascript'
      ? match.starter_code_js
      : match.starter_code_python;
    setEditorCode(LANGUAGE_STARTERS[language](starter));
  }, [match, language]);

  // Socket setup
  useEffect(() => {
    const socket = connectSocket();
    socketRef.current = socket;

    socket.emit('room:join', { room_code: roomCode });

    socket.on('match:timer', ({ remaining }) => setTimeLeft(remaining));

    socket.on('opponent:progress', (data) => setOpponentProgress(data));

    socket.on('match:finished', ({ winner: w, players }) => {
      setWinner(w);
    });

    socket.on('match:timeout', () => {
      setWinner({ username: 'No one', timeout: true });
    });

    socket.on('chat:message', (msg) => {
      setChatMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.off('match:timer');
      socket.off('opponent:progress');
      socket.off('match:finished');
      socket.off('match:timeout');
      socket.off('chat:message');
    };
  }, [roomCode]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleRun = useCallback(async () => {
    if (!match || running) return;
    setRunning(true);
    setActiveTab('results');
    try {
      const res = await api.post('/submit', {
        match_id: match.id,
        code: editorCode,
        language,
      });
      setTestResults(res.data);
      const pct = res.data.percentage;
      setMyProgress(pct);

      // Broadcast progress to opponent
      socketRef.current?.emit('code:progress', {
        room_code: roomCode,
        tests_passed: res.data.passed,
        tests_total: res.data.total,
      });

      if (res.data.all_passed) {
        socketRef.current?.emit('match:won', { room_code: roomCode, match_id: match.id });
        setWinner({ userId: user.id, username: user.username });
      }
    } catch (e) {
      setTestResults({ error: e.response?.data?.error || 'Submission failed' });
    } finally {
      setRunning(false); setSubmitting(false);
    }
  }, [match, editorCode, language, roomCode, user]);

  const sendChat = () => {
    if (!chatInput.trim()) return;
    socketRef.current?.emit('chat:message', { room_code: roomCode, message: chatInput });
    setChatInput('');
  };

  const timerClass = timeLeft !== null && timeLeft < 120 ? 'timer-danger' : timeLeft < 300 ? 'timer-warning' : '';

  if (!match) return <div className="battle-loading"><span className="spinner" /> Loading battle...</div>;

  return (
    <div className="battle-page">
      {/* Winner Modal */}
      {winner && (
        <div className="winner-overlay">
          <div className="winner-modal card">
            <div className="winner-emoji">{winner.userId === user?.id ? '🏆' : '😤'}</div>
            <h2>{winner.userId === user?.id ? 'You Won!' : `${winner.username} Won!`}</h2>
            <p className="text-muted">
              {winner.userId === user?.id
                ? 'Brilliant solve! +25 ELO earned.'
                : 'Better luck next time. -25 ELO.'}
            </p>
            {testResults && (
              <p className="mono" style={{color: 'var(--accent2)', margin: '0.5rem 0'}}>
                {testResults.passed}/{testResults.total} test cases passed
              </p>
            )}
            <div className="winner-btns">
              <button className="btn btn-primary" onClick={() => navigate('/')}>Back to Home</button>
              <button className="btn btn-ghost" onClick={() => navigate('/leaderboard')}>Leaderboard</button>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="battle-topbar">
        <div className="battle-title mono">⚔ {roomCode}</div>
        <div className={`battle-timer mono ${timerClass}`}>
          {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
        </div>
        <div className="battle-actions">
          <select className="lang-select mono" value={language} onChange={e => setLanguage(e.target.value)}>
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
          </select>
          <button className="btn btn-ghost" onClick={handleRun} disabled={running || submitting}>
            {running ? <><span className="spinner" /> Running...</> : '▶ Run & Submit'}
          </button>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="progress-bars">
        <div className="progress-player">
          <div className="avatar" style={{ background: user?.avatar_color, width: 26, height: 26, fontSize: '0.7rem' }}>
            {user?.username[0].toUpperCase()}
          </div>
          <span className="mono" style={{fontSize:'0.78rem'}}>{user?.username} (you)</span>
          <div className="progress-bar-track">
            <div className="progress-bar-fill my-fill" style={{ width: `${myProgress}%` }} />
          </div>
          <span className="progress-pct mono">{myProgress}%</span>
        </div>
        <div className="vs-divider">VS</div>
        <div className="progress-player">
          <div className="avatar" style={{ background: '#6ba3d6', width: 26, height: 26, fontSize: '0.7rem' }}>
            {opponentProgress.username[0]?.toUpperCase() || '?'}
          </div>
          <span className="mono" style={{fontSize:'0.78rem'}}>{opponentProgress.username}</span>
          <div className="progress-bar-track">
            <div className="progress-bar-fill opp-fill" style={{ width: `${opponentProgress.percentage}%` }} />
          </div>
          <span className="progress-pct mono">{opponentProgress.percentage}%</span>
        </div>
      </div>

      {/* Main Layout */}
      <div className="battle-layout">
        {/* Left Panel */}
        <div className="left-panel">
          <div className="panel-tabs">
            {['problem','results','chat'].map(t => (
              <button key={t} className={`panel-tab ${activeTab === t ? 'active' : ''}`}
                onClick={() => setActiveTab(t)}>
                {t === 'problem' ? '📄 Problem' : t === 'results' ? `✓ Results ${testResults ? `(${testResults.passed || 0}/${testResults.total || 0})` : ''}` : `💬 Chat ${chatMessages.length > 0 ? `(${chatMessages.length})` : ''}`}
              </button>
            ))}
          </div>

          {activeTab === 'problem' && match && (
            <div className="problem-panel">
              <div className="problem-header">
                <h2>{match.title}</h2>
                <span className={`badge badge-${match.difficulty}`}>{match.difficulty}</span>
              </div>
              <p className="problem-desc">{match.description}</p>
              {match.examples?.length > 0 && (
                <div className="examples">
                  <h4>Examples</h4>
                  {match.examples.map((ex, i) => (
                    <div key={i} className="example-block">
                      <div className="mono example-line"><strong>Input:</strong> {ex.input}</div>
                      <div className="mono example-line"><strong>Output:</strong> {ex.output}</div>
                      {ex.explanation && <div className="example-line text-muted" style={{fontSize:'0.82rem'}}>{ex.explanation}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'results' && (
            <div className="results-panel">
              {!testResults && <p className="text-muted" style={{padding:'1.5rem'}}>Run your code to see results here.</p>}
              {testResults?.error && <div className="result-error">{testResults.error}</div>}
              {testResults && !testResults.error && (
                <>
                  <div className="results-summary">
                    <span className={testResults.all_passed ? 'text-green' : 'text-red'} style={{fontWeight:600}}>
                      {testResults.all_passed ? '✓ All Passed!' : `${testResults.passed}/${testResults.total} Passed`}
                    </span>
                    <span className="mono text-muted">{testResults.percentage}%</span>
                  </div>
                  {testResults.results?.map((r, i) => (
                    <div key={i} className={`test-case ${r.passed ? 'pass' : 'fail'}`}>
                      <div className="test-header">
                        <span>{r.passed ? '✓' : '✗'} Test {i + 1}</span>
                        {r.time && <span className="mono text-muted" style={{fontSize:'0.72rem'}}>{r.time}s</span>}
                      </div>
                      <div className="mono test-detail"><span className="text-muted">Input:</span> {r.input}</div>
                      <div className="mono test-detail"><span className="text-muted">Expected:</span> {r.expected}</div>
                      <div className="mono test-detail"><span className={r.passed ? 'text-green' : 'text-red'}>Got:</span> {r.actual || 'null'}</div>
                      {r.error && <div className="mono test-detail text-red" style={{fontSize:'0.78rem'}}>{r.error}</div>}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="chat-panel">
              <div className="chat-messages">
                {chatMessages.length === 0 && <p className="text-muted" style={{fontSize:'0.85rem',textAlign:'center',padding:'1rem'}}>No messages yet. Say hi! 👋</p>}
                {chatMessages.map((m, i) => (
                  <div key={i} className={`chat-msg ${m.userId === user?.id ? 'mine' : 'theirs'}`}>
                    <span className="chat-sender">{m.username}</span>
                    <span className="chat-text">{m.message}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="chat-input-row">
                <input className="input" placeholder="Send a message..."
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendChat()}
                  maxLength={200}
                />
                <button className="btn btn-primary" onClick={sendChat}>Send</button>
              </div>
            </div>
          )}
        </div>

        {/* Editor */}
        <div className="editor-panel">
          <Editor
            height="100%"
            language={language}
            value={editorCode}
            onChange={(val) => setEditorCode(val || '')}
            theme="vs-dark"
            options={{
              fontSize: 14,
              fontFamily: "'JetBrains Mono', monospace",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers: 'on',
              automaticLayout: true,
              padding: { top: 16, bottom: 16 },
              wordWrap: 'on',
            }}
          />
        </div>
      </div>
    </div>
  );
}
