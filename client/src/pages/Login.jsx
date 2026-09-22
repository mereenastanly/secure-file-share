import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        setMessage('Login successful!');
        onLoginSuccess();
      } else {
        setMessage(data.message || 'Invalid credentials.');
      }
    } catch (err) {
      setMessage('Could not reach the server.');
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-eyebrow">Secure File Share</div>
      <h2>Welcome back</h2>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn-primary">
          Login
        </button>
      </form>
      {message && <p className="auth-message">{message}</p>}
    </div>
  );
}

export default Login;