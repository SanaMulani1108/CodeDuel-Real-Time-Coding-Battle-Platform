import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };
  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="brand-icon">⚔</span>
        <span className="brand-name">CodeDuel</span>
      </Link>

      <div className="navbar-links">
        <Link to="/" className={`nav-link ${isActive('/')}`}>Home</Link>
        <Link to="/leaderboard" className={`nav-link ${isActive('/leaderboard')}`}>Leaderboard</Link>
        {user && <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')}`}>Dashboard</Link>}
      </div>

      <div className="navbar-right">
        {user ? (
          <>
            <div className="nav-user">
              <div className="avatar" style={{ background: user.avatar_color }}>
                {user.username[0].toUpperCase()}
              </div>
              <div className="nav-user-info">
                <span className="nav-username">{user.username}</span>
                <span className="nav-elo mono">{user.elo} ELO</span>
              </div>
            </div>
            <button className="btn btn-ghost" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-ghost">Login</Link>
            <Link to="/register" className="btn btn-primary">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
