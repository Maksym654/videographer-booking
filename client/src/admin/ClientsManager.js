import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import './ClientsManager.css';

const telegramToken = process.env.REACT_APP_TELEGRAM_TOKEN;
const telegramChatId = process.env.REACT_APP_TELEGRAM_CHAT_ID;

function ClientsManager() {
  const [clients, setClients] = useState([]);
  const [openClientId, setOpenClientId] = useState(null);
  const [editingClientId, setEditingClientId] = useState(null);
  const [newClient, setNewClient] = useState({ name: '', phone: '', email: '' });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'clients'), (snapshot) => {
      const rawClients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const merged = [];
      rawClients.forEach(client => {
        const existing = merged.find(c =>
          (c.phone && client.phone && c.phone === client.phone) ||
          (c.email && client.email && c.email === client.email)
        );
        if (existing) {
          existing.bookings = [...(existing.bookings || []), ...(client.bookings || [])];
          existing.totalSum += client.totalSum || 0;
          existing.totalOrders += (client.bookings || []).length;
        } else {
          merged.push({
            ...client,
            totalSum: client.totalSum || 0,
            totalOrders: (client.bookings || []).length,
          });
        }
      });

      merged.sort((a, b) => {
        const pendingA = (a.bookings || []).filter(b => b.status === 'Ожидается').length;
        const pendingB = (b.bookings || []).filter(b => b.status === 'Ожидается').length;
        return pendingB - pendingA;
      });

      setClients(merged);
    });

    return () => unsubscribe();
  }, []);

  const handleAddBooking = async (clientId, newBooking) => {
    const clientRef = doc(db, 'clients', clientId);
    const clientSnap = await getDoc(clientRef);
    const clientData = clientSnap.data();
    const updatedBookings = [...(clientData.bookings || []), newBooking];
    await updateDoc(clientRef, {
      bookings: updatedBookings,
      totalOrders: updatedBookings.length,
      totalSum: (clientData.totalSum || 0) + (newBooking.payment || 0),
    });
  };

  const handleAddNewClient = async () => {
    const snapshot = await collection(db, 'clients');
    const allDocs = await onSnapshot(snapshot, () => {}); // force refetch

    const exists = clients.some(c =>
      (c.phone && c.phone === newClient.phone) ||
      (c.email && c.email === newClient.email)
    );
    if (exists) {
      alert('Клиент с таким телефоном или email уже существует');
      return;
    }

    const id = `${Date.now()}`;
    const clientRef = doc(db, 'clients', id);
    await setDoc(clientRef, {
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
          text: `🆕 Новый клиент добавлен: ${newClient.name}, ${newClient.phone || ''}, ${newClient.email || ''}`,
        })
      });
    }

    setNewClient({ name: '', phone: '', email: '' });
  };

  const toggleClient = (id) => {
    setOpenClientId(openClientId === id ? null : id);
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
            <div><b>{client.name}</b></div>
            <div>{client.phone}</div>
            <div>{client.email}</div>
            <div>{client.totalOrders} заказ(ов), {client.totalSum}€</div>
          </div>
          {openClientId === client.id && (
            <div className="client-bookings">
              {(client.bookings || []).map((booking, idx) => (
                <div key={idx} className="booking-row">
                  <div>{booking.date} {booking.startTime}–{booking.endTime}</div>
                  <div>{booking.product}</div>
                  <div>{booking.payment}€</div>
                  <div>{booking.status}</div>
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
