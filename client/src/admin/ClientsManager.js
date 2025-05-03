import React, { useEffect, useState } from 'react';
import { collection, doc, getDocs, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import './ClientsManager.css';

const telegramToken = process.env.REACT_APP_TELEGRAM_TOKEN;
const telegramChatId = process.env.REACT_APP_TELEGRAM_CHAT_ID;

function ClientsManager() {
  const [clients, setClients] = useState([]);
  const [openClientId, setOpenClientId] = useState(null);
  const [editingClientId, setEditingClientId] = useState(null);
  const [newClient, setNewClient] = useState({ name: '', phone: '', email: '' });
  const [editedClients, setEditedClients] = useState({});
  const [paymentInputs, setPaymentInputs] = useState({});

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'clients'), (snapshot) => {
      const rawClients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const merged = mergeClients(rawClients);
      merged.sort((a, b) => {
        const aPending = (a.bookings || []).filter(b => b.status === 'Ожидается').length;
        const bPending = (b.bookings || []).filter(b => b.status === 'Ожидается').length;
        return bPending - aPending;
      });
      setClients(merged);
    });
    return () => unsubscribe();
  }, []);

  const mergeClients = (clientsArray) => {
    const merged = [];
    clientsArray.forEach(client => {
      const existing = merged.find(c =>
        (c.phone && client.phone && c.phone === client.phone) ||
        (c.email && client.email && c.email === client.email)
      );
      if (existing) {
        existing.bookings = [...(existing.bookings || []), ...(client.bookings || [])];
        existing.totalSum += client.totalSum || 0;
      } else {
        merged.push({ ...client });
      }
    });
    return merged;
  };

  const handleToggleStatus = async (clientId, bookingIndex) => {
    const client = clients.find(c => c.id === clientId);
    const updatedBookings = [...client.bookings];
    const booking = updatedBookings[bookingIndex];
    booking.status = booking.status === 'Обработан' ? 'Ожидается' : 'Обработан';
    await updateDoc(doc(db, 'clients', clientId), { bookings: updatedBookings });
  };

  const handlePaymentChange = (clientId, bookingIndex, value) => {
    setPaymentInputs(prev => ({
      ...prev,
      [`${clientId}-${bookingIndex}`]: value,
    }));
  };

  const savePayment = async (clientId, bookingIndex) => {
    const client = clients.find(c => c.id === clientId);
    const updatedBookings = [...client.bookings];
    const key = `${clientId}-${bookingIndex}`;
    const value = parseFloat(paymentInputs[key]) || 0;
    updatedBookings[bookingIndex].payment = value;
    await updateDoc(doc(db, 'clients', clientId), { bookings: updatedBookings });
    setPaymentInputs(prev => ({ ...prev, [key]: '' }));
  };

  const toggleEdit = (clientId) => {
    setEditingClientId(editingClientId === clientId ? null : clientId);
    const client = clients.find(c => c.id === clientId);
    setEditedClients({ [clientId]: { ...client } });
  };

  const handleEditChange = (clientId, field, value) => {
    setEditedClients(prev => ({
      ...prev,
      [clientId]: {
        ...prev[clientId],
        [field]: value,
      }
    }));
  };

  const saveClientChanges = async (clientId) => {
    const updated = editedClients[clientId];
    await updateDoc(doc(db, 'clients', clientId), updated);
    setEditingClientId(null);
  };

  const toggleClient = (id) => {
    setOpenClientId(openClientId === id ? null : id);
  };

  const handleAddNewClient = async () => {
    const exists = clients.some(c =>
      (c.phone && c.phone === newClient.phone) ||
      (c.email && c.email === newClient.email)
    );
    if (exists) {
      alert('Клиент с таким телефоном или email уже существует');
      return;
    }
    const id = `${Date.now()}`;
    await setDoc(doc(db, 'clients', id), {
      ...newClient,
      bookings: [],
      totalOrders: 0,
      totalSum: 0,
    });
    if (telegramToken && telegramChatId) {
      fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: `🆕 Новый клиент: ${newClient.name}\n📞 ${newClient.phone}\n✉️ ${newClient.email}`,
        })
      });
    }
    setNewClient({ name: '', phone: '', email: '' });
  };

  return (
    <div className="clients-panel">
      <h2>Клиенты</h2>
      <div className="new-client-form">
        <input placeholder="Имя" value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })} />
        <input placeholder="Телефон" value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} />
        <input placeholder="Email" value={newClient.email} onChange={e => setNewClient({ ...newClient, email: e.target.value })} />
        <button onClick={handleAddNewClient}>Добавить клиента</button>
      </div>
      {clients.map(client => (
        <div key={client.id} className="client-card">
          <div className="client-header" onClick={() => toggleClient(client.id)}>
            {editingClientId === client.id ? (
              <>
                <input value={editedClients[client.id]?.name || ''} onChange={e => handleEditChange(client.id, 'name', e.target.value)} />
                <input value={editedClients[client.id]?.phone || ''} onChange={e => handleEditChange(client.id, 'phone', e.target.value)} />
                <input value={editedClients[client.id]?.email || ''} onChange={e => handleEditChange(client.id, 'email', e.target.value)} />
                <button onClick={() => saveClientChanges(client.id)}>Сохранить</button>
              </>
            ) : (
              <>
                <div><b>{client.name}</b></div>
                <div>{client.phone}</div>
                <div>{client.email}</div>
                <div>{(client.bookings || []).length} заказ(ов), {client.totalSum || 0}€</div>
                <div className="edit-icon" onClick={(e) => { e.stopPropagation(); toggleEdit(client.id); }}>✏️</div>
              </>
            )}
          </div>
          {openClientId === client.id && (
            <div className="client-bookings">
              {(client.bookings || []).map((booking, idx) => (
                <div key={idx} className="booking-row">
                  <div>{booking.date} {booking.startTime}–{booking.endTime}</div>
                  <div>{booking.product}</div>
                  <div>
                    <input
                      className="payment-input"
                      type="number"
                      value={paymentInputs[`${client.id}-${idx}`] ?? booking.payment ?? ''}
                      onChange={e => handlePaymentChange(client.id, idx, e.target.value)}
                      min="0"
                    /> €
                    <button onClick={() => savePayment(client.id, idx)}>💾</button>
                  </div>
                  <div>
                    <button
                      className={`status-btn ${booking.status === 'Ожидается' ? 'orange' : 'green'}`}
                      onClick={() => handleToggleStatus(client.id, idx)}
                    >
                      {booking.status || 'Ожидается'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default ClientsManager;
