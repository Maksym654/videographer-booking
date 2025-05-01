// ClientsManager.js — обновлённый с учётом правок
import React, { useState, useEffect } from 'react';
import { getBookings, updateClient, addBookingToClient } from '../services/firebaseService';
import './ClientsManager.css';
import translations from '../translations';

const ClientsManager = () => {
  const [clients, setClients] = useState([]);
  const [expandedClientId, setExpandedClientId] = useState(null);
  const [editModeClientId, setEditModeClientId] = useState(null);
  const [newBooking, setNewBooking] = useState({ date: '', startTime: '', endTime: '', product: '', payment: '', status: 'Ожидается' });
  const [language] = useState('de');
  const t = translations[language];

  useEffect(() => {
    const fetchData = async () => {
      const allBookings = await getBookings();
      const grouped = groupBookingsByClient(allBookings);
      setClients(grouped);
    };
    fetchData();
  }, []);

  const groupBookingsByClient = (bookings) => {
    const map = {};
    bookings.forEach(b => {
      const key = b.email || b.phone;
      if (!map[key]) {
        map[key] = {
          name: b.name,
          phone: b.phone,
          email: b.email,
          bookings: [],
          total: 0,
          pending: 0,
        };
      }
      map[key].bookings.push(b);
      if (b.payment) map[key].total += parseFloat(b.payment);
      if (b.status === 'Ожидается') map[key].pending++;
    });
    return Object.values(map);
  };

  const toggleClient = (client) => {
    setExpandedClientId(expandedClientId === client.email ? null : client.email);
  };

  const startEdit = (client) => {
    setEditModeClientId(client.email);
  };

  const saveClient = async (client, index) => {
    const updated = { ...client };
    await updateClient(updated);
    const updatedClients = [...clients];
    updatedClients[index] = updated;
    setClients(updatedClients);
    setEditModeClientId(null);
  };

  const handleInputChange = (e, clientIndex, field) => {
    const updatedClients = [...clients];
    updatedClients[clientIndex][field] = e.target.value;
    setClients(updatedClients);
  };

  const handleBookingChange = (e, field) => {
    setNewBooking({ ...newBooking, [field]: e.target.value });
  };

  const addBooking = async (client, index) => {
    const booking = {
      ...newBooking,
      name: client.name,
      phone: client.phone,
      email: client.email,
      createdAt: new Date().toISOString(),
    };
    if (!booking.product) return alert('Выберите тип съёмки');
    await addBookingToClient(booking);
    const updated = [...clients];
    updated[index].bookings.push(booking);
    setClients(updated);
    setNewBooking({ date: '', startTime: '', endTime: '', product: '', payment: '', status: 'Ожидается' });
  };

  return (
    <div className="clients-container">
      {clients.map((client, index) => (
        <div key={client.email || client.phone} className="client-card">
          <div className="client-header" onClick={() => toggleClient(client)}>
            {editModeClientId === client.email ? (
              <>
                <input value={client.name} onChange={(e) => handleInputChange(e, index, 'name')} />
                <input value={client.phone} onChange={(e) => handleInputChange(e, index, 'phone')} />
                <input value={client.email} onChange={(e) => handleInputChange(e, index, 'email')} />
                <button onClick={() => saveClient(client, index)}>💾</button>
              </>
            ) : (
              <>
                <span>{client.name}</span>
                <span>{client.phone}</span>
                <span>{client.email}</span>
                <span className="edit-icon" onClick={(e) => { e.stopPropagation(); startEdit(client); }}>✏️</span>
              </>
            )}
            <div className="summary-line">
              Общая сумма: {client.total}€ | Ожидается: {client.pending}
            </div>
          </div>

          {expandedClientId === client.email && (
            <div className="client-bookings">
              <h4>Брони:</h4>
              {client.bookings.map((b, i) => (
                <div key={i} className="booking-item">
                  <div>{b.date} — {b.startTime}-{b.endTime} | {b.product}</div>
                  <div className="booking-payment">Сумма: {b.payment || ''}€</div>
                  {b.paymentDate && (
                    <div className="booking-note">Оплачено через Stripe: {new Date(b.paymentDate).toLocaleString()}</div>
                  )}
                </div>
              ))}

              <div className="booking-form">
                <input placeholder="Дата" value={newBooking.date} onChange={(e) => handleBookingChange(e, 'date')} />
                <input placeholder="Время начала" value={newBooking.startTime} onChange={(e) => handleBookingChange(e, 'startTime')} />
                <input placeholder="Время окончания" value={newBooking.endTime} onChange={(e) => handleBookingChange(e, 'endTime')} />
                <select value={newBooking.product} onChange={(e) => handleBookingChange(e, 'product')}>
                  <option value="">Тип съёмки</option>
                  {t.types.map((type, idx) => <option key={idx} value={type}>{type}</option>)}
                </select>
                <input placeholder="Сумма" value={newBooking.payment} onChange={(e) => handleBookingChange(e, 'payment')} />
                <button onClick={() => addBooking(client, index)}>Сохранить</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ClientsManager;
