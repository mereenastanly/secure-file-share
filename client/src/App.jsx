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
    <div>
      {showLogin ? (
        <Login onLoginSuccess={() => setLoggedIn(true)} />
      ) : (
        <Register />
      )}
      <div style={{ textAlign: 'center' }}>
        <button onClick={() => setShowLogin(!showLogin)}>
          {showLogin ? 'Need an account? Register' : 'Already have an account? Login'}
        </button>
      </div>
    </div>
  );
}

export default App;