import { useState } from 'react';
import Register from './pages/Register';
import Login from './pages/Login';

function App() {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <div>
      {showLogin ? <Login /> : <Register />}
      <div style={{ textAlign: 'center' }}>
        <button onClick={() => setShowLogin(!showLogin)}>
          {showLogin ? 'Need an account? Register' : 'Already have an account? Login'}
        </button>
      </div>
    </div>
  );
}

export default App;