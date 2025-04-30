// src/admin/ProtectedAdminPanel.js
import React, { useState } from 'react';
import AdminPanel from './AdminPanel';

const ProtectedAdminPanel = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === '251436') {
      setAuthenticated(true);
    } else {
      setError('Неверный пароль');
    }
  };

  if (authenticated) return <AdminPanel />;

  return (
    <div style={{ padding: '40px', maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
      <h2>Введите пароль для доступа к админке</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: '10px', width: '100%', marginBottom: '10px' }}
        />
        <button type="submit" style={{ padding: '10px 20px' }}>Войти</button>
        {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      </form>
    </div>
  );
};

export default ProtectedAdminPanel;
