import React, { useState } from 'react';
import DatesManager from './DatesManager';
import ClientsManager from './ClientsManager';
import './AdminPanel.css';

import { getDocs, updateDoc, doc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { exportClientsToPDF } from './utils/exportToPDF';

function AdminPanel() {
  const [activeTab, setActiveTab] = useState('dates');
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === '251436') {
      setAuthenticated(true);
    } else {
      setError('Неверный пароль');
    }
  };

  const handleExportAndCleanup = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'clients'));

      const clients = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(client => (client.bookings?.length || 0) > 0);

      exportClientsToPDF(clients);

      for (const docSnap of snapshot.docs) {
        const clientData = docSnap.data();
        const bookings = clientData.bookings || [];

        const pending = bookings.filter(b => b.status !== 'done');
        const archived = bookings
          .filter(b => b.status === 'done')
          .map(b => ({ ...b, archived: true }));

        await updateDoc(doc(db, 'clients', docSnap.id), {
          bookings: pending,
          archivedBookings: [...(clientData.archivedBookings || []), ...archived],
          totalSum: pending.reduce((sum, b) => sum + (b.payment || 0), 0),
          totalOrders: pending.length,
        });
      }

      alert('База выгружена и очищена (только завершённые заказы).');
    } catch (error) {
      console.error('Ошибка при экспорте или очистке:', error);
      alert('Произошла ошибка при выгрузке. Подробности в консоли.');
    }
  };

  if (!authenticated) {
    return (
      <div style={{ padding: '40px', maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
        <h2>Введите пароль для доступа к админке</h2>
        <form onSubmit={handlePasswordSubmit}>
          <input
            type="password"
            placeholder="Пароль"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            style={{ padding: '10px', width: '100%', marginBottom: '10px' }}
          />
          <button type="submit" style={{ padding: '10px 20px' }}>Войти</button>
          {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <h1>Админ-панель</h1>

      <div className="admin-tabs">
        <button
          className={activeTab === 'dates' ? 'active' : ''}
          onClick={() => setActiveTab('dates')}
        >
          Управление датами
        </button>
        <button
          className={activeTab === 'clients' ? 'active' : ''}
          onClick={() => setActiveTab('clients')}
        >
          Менеджер клиентов
        </button>
        <button onClick={handleExportAndCleanup}>
          📄 Скачать базу
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'dates' && <DatesManager />}
        {activeTab === 'clients' && <ClientsManager />}
      </div>
    </div>
  );
}

export default AdminPanel;
