import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage('Registered successfully! You can now log in.');
      } else {
        setMessage(data.message || 'Something went wrong.');
      }
    } catch (err) {
      setMessage('Could not reach the server.');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '4rem auto', fontFamily: 'sans-serif' }}>
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label>Email</label><br />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label>Password</label><br />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        <button type="submit" style={{ padding: '0.5rem 1rem' }}>
          Register
        </button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}

export default Register;