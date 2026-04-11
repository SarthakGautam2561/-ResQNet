import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, signup } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('official');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = isSignup
      ? await signup(email, password, name, role)
      : await login(email, password);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        {/* Animated grid dots */}
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="grid-dot"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              opacity: Math.random() * 0.3 + 0.1,
            }}
          />
        ))}
      </div>

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <span className="login-logo-icon">◆</span>
            <span className="login-logo-text">RESQNET</span>
          </div>
          <p className="login-subtitle">EMERGENCY RESPONSE COMMAND CENTER</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {isSignup && (
            <div className="form-group">
              <label className="form-label">OPERATOR NAME</label>
              <input
                className="form-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">EMAIL</label>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@resqnet.in"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">PASSWORD</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {isSignup && (
            <div className="form-group">
              <label className="form-label">ROLE</label>
              <select className="form-input form-select" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="admin">Admin</option>
                <option value="official">Government Official</option>
                <option value="ngo">NGO</option>
                <option value="volunteer">Volunteer</option>
              </select>
            </div>
          )}

          {error && <div className="form-error">{error}</div>}

          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? 'AUTHENTICATING...' : isSignup ? 'CREATE ACCOUNT' : 'ACCESS COMMAND CENTER'}
          </button>
        </form>

        <div className="login-footer">
          <button className="toggle-btn" onClick={() => setIsSignup(!isSignup)}>
            {isSignup ? 'Already have an account? Login' : 'Need an account? Sign up'}
          </button>
          <button className="public-btn" onClick={() => navigate('/public')}>
            Access as Public Viewer →
          </button>
        </div>
      </div>
    </div>
  );
}
