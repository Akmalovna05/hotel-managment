import { useState } from 'react';

export default function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('reception');
  const [password, setPassword] = useState('reception123');
  const [error, setError] = useState('');

  return (
    <div className="login">
      <h1>HotelOS Login</h1>
      <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button
        type="button"
        onClick={async () => {
          try {
            setError('');
            await onLogin(username, password);
          } catch (e) {
            setError(e.response?.data?.error || 'Login failed');
          }
        }}
      >
        Login
      </button>
      {error && <p className="error">{error}</p>}
      <p className="hint">Demo: reception / reception123</p>
    </div>
  );
}
