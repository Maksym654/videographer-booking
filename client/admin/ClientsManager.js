import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where
} from 'firebase/firestore';
import './ClientsManager.css';

const formatDate = (input) => {
  try {
    const date = input?.seconds
      ? new Date(input.seconds * 1000)
      : new Date(input);
    return date.toLocaleDateString('ru-RU');
  } catch {
    return input;
  }
};

function ClientsManager() {
  const [clients, setClients] = useState([]);
  const [editClientId, setEditClientId] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [sortBy, setSortBy] = useState('status');
  const [newClient, setNewClient] = useState({ name: '', phone: '', email: '' });
  const [newBooking, setNewBooking] = useState({ product: '', payment: '' });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const snapshot = await getDocs(collection(db, 'clients'));
    const rawClients = snapshot.docs.map(docItem => ({
      id: docItem.id,
      ...docItem.data()
    }));

    for (const client of rawClients) {
      if (client.totalOrders === undefined) {
        const totalOrders = (client.bookings || []).length;
        await updateDoc(doc(db, 'clients', client.id), { totalOrders });
        client.totalOrders = totalOrders;
      }
    }

    const mergedClients = mergeClients(rawClients);
    setClients(mergedClients);
  };

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

  const countPendingBookings = (client) => {
    return (client.bookings || []).filter(b => b.status !== 'done').length;
  };

  const handleEditClick = (id, client) => {
    setEditClientId(editClientId === id ? null : id);
    setEditedData({ ...client });
  };

  const handleChange = (field, value) => {
    setEditedData({ ...editedData, [field]: value });
  };

  const handleSaveChanges = async () => {
    const docRef = doc(db, 'clients', editClientId);
    const totalSum = (editedData.bookings || []).reduce((sum, booking) => sum + (booking.payment || 0), 0);
    await updateDoc(docRef, { ...editedData, totalSum });
    setEditClientId(null);
    fetchClients();
  };

  const handleDeleteClient = async (id) => {
    if (window.confirm('Удалить клиента?')) {
      await deleteDoc(doc(db, 'clients', id));
      fetchClients();
    }
  };

  const handleToggleBookingStatus = async (clientId, bookingIdx) => {
    const client = clients.find(c => c.id === clientId);
    const bookings = [...client.bookings];
    bookings[bookingIdx].status = bookings[bookingIdx].status === 'done' ? 'pending' : 'done';
    const totalSum = bookings.reduce((sum, b) => sum + (b.payment || 0), 0);
    await updateDoc(doc(db, 'clients', clientId), { bookings, totalSum });
    fetchClients();
  };

  const handleBookingPaymentChange = (clientId, bookingIdx, value) => {
    setClients(prevClients => prevClients.map(client => {
      if (client.id === clientId) {
        const updatedBookings = [...client.bookings];
        updatedBookings[bookingIdx].payment = parseFloat(value) || 0;
        return { ...client, bookings: updatedBookings };
      }
      return client;
    }));
  };

  const handleAddBooking = async (clientId) => {
    if (!newBooking.product || !newBooking.payment) return alert('Заполните поля брони');
    const clientDocRef = doc(db, 'clients', clientId);
    const clientSnapshot = await getDocs(query(collection(db, 'clients')));
    const clientData = clientSnapshot.docs.find(d => d.id === clientId).data();

    const updatedBookings = [...clientData.bookings, {
      date: new Date().toISOString(),
      startTime: '',
      endTime: '',
      product: newBooking.product,
      payment: parseFloat(newBooking.payment),
      status: 'pending',
      agreePolicy: true,
      agreePrepayment: true,
      createdAt: new Date()
    }];

    const totalOrders = (clientData.totalOrders || 0) + 1;
    const totalSum = updatedBookings.reduce((sum, b) => sum + (b.payment || 0), 0);

    await updateDoc(clientDocRef, {
      bookings: updatedBookings,
      totalSum,
      totalOrders
    });

    setNewBooking({ product: '', payment: '' });
    fetchClients();
  };

  const handleAddNewClient = async () => {
    if (!newClient.name || (!newClient.phone && !newClient.email)) {
      return alert('Заполните имя и хотя бы телефон или email');
    }

    const phoneQuery = query(collection(db, 'clients'), where('phone', '==', newClient.phone));
    const emailQuery = query(collection(db, 'clients'), where('email', '==', newClient.email));

    const phoneMatch = await getDocs(phoneQuery);
    const emailMatch = await getDocs(emailQuery);

    if (!phoneMatch.empty || !emailMatch.empty) {
      alert('Клиент с таким телефоном или email уже существует!');
      return;
    }

    await addDoc(collection(db, 'clients'), {
      ...newClient,
      bookings: [],
      totalSum: 0,
      totalOrders: 0,
      status: 'pending'
    });

    setNewClient({ name: '', phone: '', email: '' });
    fetchClients();
  };

  const sortedClients = [...clients].sort((a, b) => {
    const aPending = countPendingBookings(a);
    const bPending = countPendingBookings(b);
    if (aPending !== bPending) return bPending - aPending;
    if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
    if (sortBy === 'email') return (a.email || '').localeCompare(b.email || '');
    if (sortBy === 'phone') return (a.phone || '').localeCompare(b.phone || '');
    return 0;
  });

  return (
    <div className="clients-manager">
      <h2>Клиенты</h2>

      <div className="sort-controls">
        <label>Сортировать по:&nbsp;</label>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="name">Имя</option>
          <option value="email">Email</option>
          <option value="phone">Телефон</option>
        </select>
      </div>

      <div className="new-client-form">
        <h3>Добавить нового клиента</h3>
        <input placeholder="Имя" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} />
        <input placeholder="Телефон" value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} />
        <input placeholder="Email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} />
        <button onClick={handleAddNewClient}>Добавить клиента</button>
      </div>

      {sortedClients.map(client => {
        const pendingCount = countPendingBookings(client);
        return (
          <div key={client.id} className="client-card">
            <div onClick={() => handleEditClick(client.id, client)} className="client-summary">
              <strong>Имя:</strong> {client.name} | <strong>Телефон:</strong> {client.phone} | <strong>Email:</strong> {client.email || '-'}
              <br />
              <strong>Общая сумма:</strong> {client.totalSum}€
              {pendingCount > 0 && <span style={{ color: 'orange', marginLeft: '10px' }}>Ожидает заказов: {pendingCount}</span>}
              <span style={{ color: '#999', marginLeft: '10px' }}>Всего заказов: {client.totalOrders || 0}</span>
            </div>

            {editClientId === client.id && (
              <div className="edit-section">
                <input value={editedData.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="Имя" />
                <input value={editedData.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="Телефон" />
                <input value={editedData.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="Email" />
                <button onClick={handleSaveChanges}>Сохранить изменения</button>
                <button className="delete-btn" onClick={() => handleDeleteClient(client.id)}>Удалить клиента</button>

                <div className="bookings-list">
                  <h4>Брони:</h4>
                  {client.bookings?.map((booking, idx) => (
                    <div key={idx} className="booking-entry">
                      {formatDate(booking.date)} {booking.startTime} - {booking.endTime} | {booking.product} |
                      <strong> Сумма:</strong> {booking.payment || 0}€

                      {booking.paymentDate && (
                        <div style={{ fontSize: '12px', color: '#4caf50', marginTop: '4px' }}>
                          ✅ Бронь оплачена через Stripe {new Date(booking.paymentDate).toLocaleString('ru-RU')}, сумма: 50€
                        </div>
                      )}

                      <input
                        type="number"
                        value={booking.payment || ''}
                        onChange={(e) => handleBookingPaymentChange(client.id, idx, e.target.value)}
                        placeholder="Оплата"
                      />
                      <button
                        className={`status-button ${booking.status === 'done' ? 'status-done' : 'status-pending'}`}
                        onClick={() => handleToggleBookingStatus(client.id, idx)}
                      >
                        {booking.status === 'done' ? 'Обработан' : 'Ожидается'}
                      </button>
                    </div>
                  ))}

                  <div className="add-booking-form">
                    <h5>Добавить новую бронь:</h5>
                    <input
                      placeholder="Тип съёмки"
                      value={newBooking.product}
                      onChange={(e) => setNewBooking({ ...newBooking, product: e.target.value })}
                    />
                    <input
                      type="number"
                      placeholder="Сумма оплаты"
                      value={newBooking.payment}
                      onChange={(e) => setNewBooking({ ...newBooking, payment: e.target.value })}
                    />
                    <button onClick={() => handleAddBooking(client.id)}>Добавить бронь</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ClientsManager;
