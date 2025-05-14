import React, { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  addDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import './ClientsManager.css';

const formatDate = (input) => {
  try {
    const date = input?.seconds ? new Date(input.seconds * 1000) : new Date(input);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) + ' ' + date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return input;
  }
};

function ClientsManager() {
  const [clients, setClients] = useState([]);
  const [editClientId, setEditClientId] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [openClientId, setOpenClientId] = useState(null);
  const [sortBy, setSortBy] = useState('status');
  const [newBooking, setNewBooking] = useState({ product: '', payment: '' });
  const [paymentEdited, setPaymentEdited] = useState({});
  const [newClient, setNewClient] = useState({ name: '', phone: '', email: '' });

  useEffect(() => {
    const clientsRef = collection(db, 'clients');
    const unsubscribe = onSnapshot(clientsRef, async (snapshot) => {
      const rawClients = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const updatedClients = await Promise.all(
        rawClients.map(async client => {
          if (client.totalOrders === undefined) {
            const totalOrders = (client.bookings || []).length;
            await updateDoc(doc(db, 'clients', client.id), { totalOrders });
            client.totalOrders = totalOrders;
          }
          return client;
        })
      );

      setClients(updatedClients);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateClient = async () => {
    if (!newClient.name || !newClient.phone) {
      return alert('Введите имя и телефон клиента');
    }

    const duplicate = clients.find(c =>
      c.phone === newClient.phone || (newClient.email && c.email === newClient.email)
    );
    if (duplicate) {
      return alert('Клиент с таким телефоном или email уже существует');
    }

    try {
      await addDoc(collection(db, 'clients'), {
        ...newClient,
        bookings: [],
        totalOrders: 0,
        totalSum: 0,
        createdAt: new Date()
      });
      setNewClient({ name: '', phone: '', email: '' });
    } catch (error) {
      console.error('Ошибка при добавлении клиента:', error);
      alert('Ошибка при добавлении клиента');
    }
  };

  const countPendingBookings = (client) => {
    return (client.bookings || []).filter(b => b.status !== 'done').length;
  };

  const handleToggleOpen = (id) => {
    setOpenClientId(openClientId === id ? null : id);
  };

  const handleEditClick = (client) => {
    setEditClientId(client.id);
    setEditedData({ ...client });
  };

  const handleChange = (field, value) => {
    setEditedData({ ...editedData, [field]: value });
  };

  const handleSaveChanges = async () => {
    const totalSum = (editedData.bookings || []).reduce((sum, booking) => sum + (booking.payment || 0), 0);
    await updateDoc(doc(db, 'clients', editClientId), { ...editedData, totalSum });
    setEditClientId(null);
  };

  const handleDeleteClient = async (id) => {
    if (window.confirm('Удалить клиента?')) {
      await deleteDoc(doc(db, 'clients', id));
    }
  };

  const handleToggleBookingStatus = async (clientId, bookingIdx) => {
    const client = clients.find(c => c.id === clientId);
    const bookings = [...client.bookings];
    bookings[bookingIdx].status = bookings[bookingIdx].status === 'done' ? 'pending' : 'done';
    const totalSum = bookings.reduce((sum, b) => sum + (b.payment || 0), 0);
    await updateDoc(doc(db, 'clients', clientId), { bookings, totalSum });
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
    setPaymentEdited(prev => ({
      ...prev,
      [`${clientId}_${bookingIdx}`]: true
    }));
  };

  const saveBookingPayment = async (clientId) => {
    const client = clients.find(c => c.id === clientId);
    const totalSum = (client.bookings || []).reduce((sum, b) => sum + (b.payment || 0), 0);
    await updateDoc(doc(db, 'clients', clientId), {
      bookings: client.bookings,
      totalSum
    });
    setPaymentEdited({});
  };

  const handleAddBooking = async (clientId) => {
    if (!newBooking.product || !newBooking.payment) return alert('Заполните поля брони');

    const clientDoc = await getDoc(doc(db, 'clients', clientId));
    const clientData = clientDoc.data();

    const updatedBookings = [...(clientData.bookings || []), {
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

    await updateDoc(doc(db, 'clients', clientId), {
      bookings: updatedBookings,
      totalSum,
      totalOrders
    });

    setNewBooking({ product: '', payment: '' });
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

      {/* 🔘 Форма добавления нового клиента */}
      <div className="create-client-form">
        <h4>Создать нового клиента</h4>
        <input
          type="text"
          placeholder="Имя"
          value={newClient.name}
          onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
        />
        <input
          type="text"
          placeholder="Телефон"
          value={newClient.phone}
          onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
        />
        <input
          type="email"
          placeholder="Email"
          value={newClient.email}
          onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
        />
        <button onClick={handleCreateClient}>➕ Добавить клиента</button>
      </div>

      {sortedClients.map(client => {
        const isEditing = editClientId === client.id;
        const isOpen = openClientId === client.id;
        const pendingCount = countPendingBookings(client);

        return (
          <div key={client.id} className="client-card">
            <div className="client-summary" onClick={() => handleToggleOpen(client.id)}>
              <button
                className="edit-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleEditClick(client);
                }}
              >
                ✏️
              </button>

              {isEditing ? (
                <>
                  <input value={editedData.name} onChange={(e) => handleChange('name', e.target.value)} />
                  <input value={editedData.phone} onChange={(e) => handleChange('phone', e.target.value)} />
                  <input value={editedData.email} onChange={(e) => handleChange('email', e.target.value)} />
                  <div className="edit-icons">
                    <button onClick={handleSaveChanges}>💾</button>
                    <button onClick={() => handleDeleteClient(client.id)}>🗑️</button>
                  </div>
                </>
              ) : (
                <>
                  <strong>Имя:</strong> {client.name} <br />
                  <strong>Телефон:</strong> {client.phone} <br />
                  <strong>Email:</strong> {client.email || '-'} <br />
                  <strong>Общая сумма:</strong> {client.totalSum}€ <br />
                  {pendingCount > 0 && (
                    <span className="pending-count">Ожидает заказов: {pendingCount}</span>
                  )}
                  <div className="total-orders">Всего заказов: {client.totalOrders || 0}</div>
                </>
              )}
            </div>

            {isOpen && (
              <div className="bookings-list">
                <h4>Брони:</h4>
                {client.bookings?.map((booking, idx) => (
                  <div key={idx} className="booking-entry">
                    {formatDate(booking.date)} {booking.startTime} - {booking.endTime} | {booking.product} |
                    <strong> Сумма:</strong> {booking.payment || 0}€

                    {booking.paymentDate && (
                      <div className="stripe-note">
                        ✅ Бронь оплачена через Stripe {new Date(booking.paymentDate).toLocaleString('ru-RU')}, сумма: 50€
                      </div>
                    )}

                    <input
                      type="number"
                      value={booking.payment ?? ''}
                      placeholder="Сумма"
                      min={0}
                      onChange={(e) => handleBookingPaymentChange(client.id, idx, e.target.value)}
                    />
                    {paymentEdited[`${client.id}_${idx}`] && (
                      <button className="save-btn" onClick={() => saveBookingPayment(client.id)}>💾</button>
                    )}
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
                  <select
                    value={newBooking.product}
                    onChange={(e) => setNewBooking({ ...newBooking, product: e.target.value })}
                  >
                    <option value="">Выберите тип съёмки</option>
                    <option value="UGC">UGC</option>
                    <option value="Контент">Контент</option>
                    <option value="Каталог">Каталог</option>
                    <option value="Реклама">Реклама</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Сумма оплаты"
                    value={newBooking.payment}
                    min={0}
                    onChange={(e) => setNewBooking({ ...newBooking, payment: e.target.value })}
                  />
                  <button onClick={() => handleAddBooking(client.id)}>Добавить бронь</button>
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
