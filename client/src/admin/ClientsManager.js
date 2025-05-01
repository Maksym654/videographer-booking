// ClientsManager.js — обновлённый с учётом правок UI и логики
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import './ClientsManager.css';
import translations from '../../translations';

const ClientsManager = () => {
  const [clients, setClients] = useState([]);
  const [editingClientId, setEditingClientId] = useState(null);
  const [editedClient, setEditedClient] = useState({});
  const [expandedClientId, setExpandedClientId] = useState(null);

  const lang = 'ru';

  useEffect(() => {
    const unsubscribe = db.collection('clients').onSnapshot(snapshot => {
      const clientsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClients(clientsData);
    });
    return () => unsubscribe();
  }, []);

  const handleEditClick = (client) => {
    setEditingClientId(client.id);
    setEditedClient(client);
  };

  const handleSaveClick = async () => {
    await db.collection('clients').doc(editingClientId).update(editedClient);
    setEditingClientId(null);
  };

  const handleFieldChange = (field, value) => {
    setEditedClient(prev => ({ ...prev, [field]: value }));
  };

  const toggleBookingStatus = async (clientId, bookingIndex) => {
    const client = clients.find(c => c.id === clientId);
    const updatedBookings = [...client.bookings];
    updatedBookings[bookingIndex].status =
      updatedBookings[bookingIndex].status === 'pending' ? 'completed' : 'pending';
    await db.collection('clients').doc(clientId).update({ bookings: updatedBookings });
  };

  const handleAmountChange = (clientId, bookingIndex, value) => {
    setClients(prevClients => prevClients.map(client => {
      if (client.id === clientId) {
        const updatedBookings = [...client.bookings];
        updatedBookings[bookingIndex].amount = parseFloat(value) || 0;
        return { ...client, bookings: updatedBookings };
      }
      return client;
    }));
  };

  const saveBookingAmount = async (clientId, bookingIndex) => {
    const client = clients.find(c => c.id === clientId);
    const updatedBookings = [...client.bookings];
    await db.collection('clients').doc(clientId).update({ bookings: updatedBookings });
  };

  const getTotalAmount = (bookings) => {
    return bookings.reduce((sum, b) => sum + (b.amount || 0), 0);
  };

  const getPendingCount = (bookings) => {
    return bookings.filter(b => b.status === 'pending').length;
  };

  const getTypeLabel = (type) => {
    const ruTypes = translations['ru'].shootTypes;
    return ruTypes[type] || type;
  };

  return (
    <div className="clients-wrapper">
      {clients.map(client => (
        <div
          key={client.id}
          className="client-card"
        >
          <div className="client-summary" onClick={() => setExpandedClientId(client.id === expandedClientId ? null : client.id)}>
            <p><strong>Имя:</strong> {client.name}</p>
            <p><strong>Телефон:</strong> {client.phone}</p>
            <p><strong>Email:</strong> {client.email}</p>
            <p><strong>Общая сумма:</strong> {getTotalAmount(client.bookings)}€</p>
            <p className="status-counts">
              <span className="pending">Ожидает заказов: {getPendingCount(client.bookings)}</span>
              <span>Всего заказов: {client.bookings.length}</span>
            </p>
            <button className="edit-icon" onClick={(e) => { e.stopPropagation(); handleEditClick(client); }}>✏️</button>
          </div>

          {expandedClientId === client.id && (
            <div className="client-details">
              {editingClientId === client.id ? (
                <div className="edit-fields">
                  <input
                    value={editedClient.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                  />
                  <input
                    value={editedClient.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                  />
                  <input
                    value={editedClient.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                  />
                  <button onClick={handleSaveClick}>Сохранить</button>
                </div>
              ) : null}

              <div className="bookings-list">
                <p><strong>Брони:</strong></p>
                {client.bookings.map((b, index) => (
                  <div key={index} className="booking-item">
                    <div className="booking-info">
                      <span>{new Date(b.date).toLocaleDateString()} | {getTypeLabel(b.product)} |</span>
                      <span><strong>Сумма:</strong> {b.amount || 0}€</span>
                    </div>
                    {b.paymentDate && (
                      <p className="stripe-note">
                        ✅ Бронь оплачена через Stripe {new Date(b.paymentDate).toLocaleString()}, сумма: {b.paymentAmount || 50}€
                      </p>
                    )}
                    <div className="booking-controls">
                      <input
                        type="number"
                        min="0"
                        value={b.amount || ''}
                        onChange={(e) => handleAmountChange(client.id, index, e.target.value)}
                      />
                      <button
                        onClick={() => toggleBookingStatus(client.id, index)}
                        className={b.status === 'pending' ? 'pending' : 'completed'}
                      >
                        {b.status === 'pending' ? 'Ожидается' : 'Обработан'}
                      </button>
                      <button
                        className="save-btn"
                        onClick={() => saveBookingAmount(client.id, index)}
                      >
                        💾
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ClientsManager;
