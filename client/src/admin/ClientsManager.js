// ClientsManager.js — обновлённый с учётом всех требований
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import './ClientsManager.css';
import translations from '../translations';
import { collection, getDocs, updateDoc, doc, addDoc, query, where } from 'firebase/firestore';

const ClientsManager = () => {
  const [clients, setClients] = useState([]);
  const [editingClientId, setEditingClientId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [editAmounts, setEditAmounts] = useState({});
  const [newBooking, setNewBooking] = useState({});

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const snapshot = await getDocs(collection(db, 'bookings'));
    const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const grouped = {};
    bookings.forEach(b => {
      const key = b.phone + b.email;
      if (!grouped[key]) grouped[key] = { bookings: [], name: b.name, phone: b.phone, email: b.email };
      grouped[key].bookings.push(b);
    });
    setClients(Object.values(grouped));
  };

  const handleClientFieldChange = (id, field, value) => {
    setEditValues(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const saveClientChanges = async (client) => {
    const updates = editValues[client.phone + client.email];
    if (updates) {
      const updatedClient = { ...client, ...updates };
      const bookingsToUpdate = client.bookings;
      for (let b of bookingsToUpdate) {
        const ref = doc(db, 'bookings', b.id);
        await updateDoc(ref, updates);
      }
      setEditingClientId(null);
      fetchClients();
    }
  };

  const handleAmountChange = (bookingId, value) => {
    setEditAmounts(prev => ({ ...prev, [bookingId]: value }));
  };

  const saveAmount = async (bookingId) => {
    const ref = doc(db, 'bookings', bookingId);
    await updateDoc(ref, { amount: parseFloat(editAmounts[bookingId]) });
    fetchClients();
  };

  const toggleStatus = async (bookingId, currentStatus) => {
    const ref = doc(db, 'bookings', bookingId);
    const newStatus = currentStatus === 'pending' ? 'done' : 'pending';
    await updateDoc(ref, { status: newStatus });
    fetchClients();
  };

  const handleAddBooking = async (client, product, amount) => {
    if (!product || !amount) return;
    const ref = collection(db, 'bookings');
    await addDoc(ref, {
      name: client.name,
      phone: client.phone,
      email: client.email,
      product,
      amount: parseFloat(amount),
      status: 'pending',
      date: new Date().toISOString(),
    });
    setNewBooking({});
    fetchClients();
  };

  return (
    <div className="clients-manager">
      {clients.map(client => {
        const clientId = client.phone + client.email;
        const totalAmount = client.bookings.reduce((sum, b) => sum + (b.amount || 0), 0);
        const pendingCount = client.bookings.filter(b => b.status !== 'done').length;

        return (
          <div key={clientId} className="client-card">
            <div className="client-header">
              {editingClientId === clientId ? (
                <>
                  <input value={editValues[clientId]?.name || client.name} onChange={e => handleClientFieldChange(clientId, 'name', e.target.value)} />
                  <input value={editValues[clientId]?.phone || client.phone} onChange={e => handleClientFieldChange(clientId, 'phone', e.target.value)} />
                  <input value={editValues[clientId]?.email || client.email} onChange={e => handleClientFieldChange(clientId, 'email', e.target.value)} />
                  <button onClick={() => saveClientChanges(client)}>Сохранить изменения</button>
                </>
              ) : (
                <>
                  <p><strong>Имя:</strong> {client.name}</p>
                  <p><strong>Телефон:</strong> {client.phone}</p>
                  <p><strong>Email:</strong> {client.email}</p>
                  <p><strong>Общая сумма:</strong> {totalAmount}€ <span className="pending-count">Ожидает заказов: {pendingCount}</span> <span className="all-count">Всего заказов: {client.bookings.length}</span></p>
                  <span className="edit-icon" onClick={() => setEditingClientId(clientId)}>✏️</span>
                </>
              )}
            </div>

            <h4>Брони:</h4>
            {client.bookings.map(booking => (
              <div key={booking.id} className="booking-entry">
                <div><strong>{booking.date}</strong> | {booking.product || '—'} | <strong>Сумма:</strong> {booking.amount || 0}€</div>
                {booking.paymentDate && (
                  <div className="stripe-info">✔️ Бронь оплачена через Stripe {booking.paymentDate}, сумма: {booking.paymentAmount}€</div>
                )}
                <div className="booking-inline">
                  <input
                    type="number"
                    value={editAmounts[booking.id] || ''}
                    placeholder="Сумма"
                    onChange={e => handleAmountChange(booking.id, e.target.value)}
                  />
                  <button onClick={() => saveAmount(booking.id)}>💾</button>
                  <button
                    className={`status-toggle ${booking.status === 'done' ? 'done' : 'pending'}`}
                    onClick={() => toggleStatus(booking.id, booking.status)}
                  >
                    {booking.status === 'done' ? 'Обработан' : 'Ожидается'}
                  </button>
                </div>
              </div>
            ))}

            <div className="add-booking-block">
              <label>Добавить новую бронь:</label>
              <select value={newBooking[clientId]?.product || ''} onChange={e => setNewBooking(prev => ({ ...prev, [clientId]: { ...prev[clientId], product: e.target.value } }))}>
                <option value="">Тип съёмки</option>
                <option value="UGC">UGC</option>
                <option value="Interview">Interview</option>
                <option value="Event">Event</option>
              </select>
              <input
                type="number"
                placeholder="Сумма оплаты"
                value={newBooking[clientId]?.amount || ''}
                onChange={e => setNewBooking(prev => ({ ...prev, [clientId]: { ...prev[clientId], amount: e.target.value } }))}
              />
              <button onClick={() => handleAddBooking(client, newBooking[clientId]?.product, newBooking[clientId]?.amount)}>Добавить бронь</button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ClientsManager;
