import React, { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import './ClientsManager.css';

const formatDate = (input) => {
  try {
    const date = input?.seconds ? new Date(input.seconds * 1000) : new Date(input);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    }) + ' ' + date.toLocaleTimeString('ru-RU', {
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return input;
  }
};

function ClientsManager() {
  const [clients, setClients] = useState([]);
  const [editClientId, setEditClientId] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [sortBy, setSortBy] = useState('status');
  const [newBooking, setNewBooking] = useState({ product: '', payment: '' });
  const [paymentEdited, setPaymentEdited] = useState({});

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'clients'), async (snapshot) => {
      const clientsData = await Promise.all(snapshot.docs.map(async docSnap => {
        const data = docSnap.data();
        if (data.totalOrders === undefined) {
          const totalOrders = (data.bookings || []).length;
          await updateDoc(doc(db, 'clients', docSnap.id), { totalOrders });
          data.totalOrders = totalOrders;
        }
        return { id: docSnap.id, ...data };
      }));
      setClients(clientsData);
    });
    return () => unsubscribe();
  }, []);

  const countPending = client => (client.bookings || []).filter(b => b.status !== 'done').length;

  const toggleEdit = (id, client) => {
    setEditClientId(id === editClientId ? null : id);
    setEditedData(client);
  };

  const handleChange = (field, value) => setEditedData({ ...editedData, [field]: value });

  const saveClient = async () => {
    const totalSum = (editedData.bookings || []).reduce((s, b) => s + (b.payment || 0), 0);
    await updateDoc(doc(db, 'clients', editClientId), { ...editedData, totalSum });
    setEditClientId(null);
  };

  const deleteClient = async id => window.confirm('Удалить клиента?') && await deleteDoc(doc(db, 'clients', id));

  const toggleStatus = async (id, idx) => {
    const client = clients.find(c => c.id === id);
    const bookings = [...client.bookings];
    bookings[idx].status = bookings[idx].status === 'done' ? 'pending' : 'done';
    const totalSum = bookings.reduce((s, b) => s + (b.payment || 0), 0);
    await updateDoc(doc(db, 'clients', id), { bookings, totalSum });
  };

  const changePayment = (id, idx, value) => {
    setClients(prev => prev.map(c => {
      if (c.id === id) {
        const bookings = [...c.bookings];
        bookings[idx].payment = value === '' ? '' : parseFloat(value);
        return { ...c, bookings };
      }
      return c;
    }));
    setPaymentEdited(prev => ({ ...prev, [`${id}_${idx}`]: true }));
  };

  const savePayment = async id => {
    const client = clients.find(c => c.id === id);
    const totalSum = client.bookings.reduce((s, b) => s + (b.payment || 0), 0);
    await updateDoc(doc(db, 'clients', id), { bookings: client.bookings, totalSum });
    setPaymentEdited({});
  };

  const addBooking = async id => {
    if (!newBooking.product || !newBooking.payment) return alert('Заполните поля');
    const snap = await getDoc(doc(db, 'clients', id));
    const client = snap.data();
    const bookings = [...(client.bookings || []), {
      date: new Date().toISOString(), startTime: '', endTime: '',
      product: newBooking.product, payment: parseFloat(newBooking.payment),
      status: 'pending', agreePolicy: true, agreePrepayment: true, createdAt: new Date()
    }];
    const totalOrders = (client.totalOrders || 0) + 1;
    const totalSum = bookings.reduce((s, b) => s + (b.payment || 0), 0);
    await updateDoc(doc(db, 'clients', id), { bookings, totalSum, totalOrders });
    setNewBooking({ product: '', payment: '' });
  };

  const sorted = [...clients].sort((a, b) => {
    const ap = countPending(a), bp = countPending(b);
    if (ap !== bp) return bp - ap;
    return (a[sortBy] || '').localeCompare(b[sortBy] || '');
  });

  return (
    <div className="clients-manager">
      <h2>Клиенты</h2>
      <div className="sort-controls">
        <label>Сортировать по:&nbsp;</label>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="name">Имя</option>
          <option value="email">Email</option>
          <option value="phone">Телефон</option>
        </select>
      </div>

      {sorted.map(client => (
        <div key={client.id} className="client-card">
          <div className="client-summary">
            {editClientId === client.id ? (
              <>
                <input value={editedData.name} onChange={e => handleChange('name', e.target.value)} />
                <input value={editedData.phone} onChange={e => handleChange('phone', e.target.value)} />
                <input value={editedData.email} onChange={e => handleChange('email', e.target.value)} />
                <div className="edit-icons">
                  <button onClick={saveClient}>💾</button>
                  <button onClick={() => deleteClient(client.id)}>🗑</button>
                </div>
              </>
            ) : (
              <>
                <strong>{client.name}</strong> | {client.phone} | {client.email || '-'}
                <div className="summary-right">
                  <span>{client.totalSum}€</span>
                  {countPending(client) > 0 && <span className="pending-count">Ожидает: {countPending(client)}</span>}
                  <span className="total-orders">Всего: {client.totalOrders || 0}</span>
                  <button onClick={() => toggleEdit(client.id, client)} className="edit-btn">✏️</button>
                </div>
              </>
            )}
          </div>

          {editClientId === client.id && (
            <div className="bookings-list">
              {client.bookings?.map((b, idx) => (
                <div key={idx} className="booking-entry">
                  {formatDate(b.date)} {b.startTime}–{b.endTime} | {b.product} |
                  <strong> {b.payment || 0}€</strong>

                  {b.paymentDate && (
                    <div className="stripe-note">💳 Оплачено через Stripe {formatDate(b.paymentDate)}, сумма: 50€</div>
                  )}

                  <input
                    type="number"
                    value={b.payment === 0 ? '' : b.payment || ''}
                    placeholder="Сумма"
                    min={0}
                    onChange={e => changePayment(client.id, idx, e.target.value)}
                  />
                  {paymentEdited[`${client.id}_${idx}`] && (
                    <button className="save-btn" onClick={() => savePayment(client.id)}>💾</button>
                  )}

                  <button
                    className={`status-button ${b.status === 'done' ? 'status-done' : 'status-pending'}`}
                    onClick={() => toggleStatus(client.id, idx)}
                  >{b.status === 'done' ? 'Обработан' : 'Ожидается'}</button>
                </div>
              ))}

              <div className="add-booking-form">
                <h5>Добавить новую бронь:</h5>
                <select
                  value={newBooking.product}
                  onChange={e => setNewBooking({ ...newBooking, product: e.target.value })}>
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
                  onChange={e => setNewBooking({ ...newBooking, payment: e.target.value })}
                />
                <button onClick={() => addBooking(client.id)}>Добавить бронь</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default ClientsManager;