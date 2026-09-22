import { useState } from 'react';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('token'));

  if (loggedIn) {
    return <Dashboard />;
  }

  return (
    <div className="auth-shell">
      {showLogin ? (
        <Login onLoginSuccess={() => setLoggedIn(true)} />
      ) : (
        <Register />
      )}
      <button className="auth-switch" onClick={() => setShowLogin(!showLogin)}>
        {showLogin ? 'Need an account? Register' : 'Already have an account? Login'}
      </button>
    </div>
  );
}

export default App;