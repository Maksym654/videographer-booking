import React, { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  setDoc
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

  // Убираем старую логику с отправкой сообщений
  const handleAddClient = async (newClient) => {
    const clientRef = doc(collection(db, 'clients'));

    // Добавляем нового клиента в Firestore
    await setDoc(clientRef, {
      ...newClient,
    });

    console.log('Новый клиент добавлен в админ-панель');
    
    // Отправляем сообщение в Telegram при добавлении нового клиента
    const message = `
      📬 Новый клиент:
      👤 ${newClient.name}
      📞 ${newClient.phone}
      📧 ${newClient.email}
    `;
    
    // Функция отправки сообщения в Telegram
    sendTelegramMessage(message);
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

    // Отправляем сообщение в Telegram при добавлении нового бронирования
    const message = `
      📬 Новая бронь для клиента:
      👤 ${clientData.name}
      📞 ${clientData.phone}
      📧 ${clientData.email}
      📸 ${newBooking.product}
      💶 Оплата: ${newBooking.payment}€
    `;
    
    // Функция отправки сообщения в Telegram
    sendTelegramMessage(message);
  };

  // Функция отправки сообщения в Telegram
  function sendTelegramMessage(message) {
    const telegramUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    const chatId = process.env.TELEGRAM_CHAT_IDS;

    const data = {
      chat_id: chatId,
      text: message
    };

    fetch(telegramUrl, {
      method: 'POST',
      body: new URLSearchParams(data),
    })
    .then(response => response.json())
    .then(json => console.log('Сообщение отправлено в Telegram:', json))
    .catch(err => console.error('Ошибка при отправке в Telegram:', err));
  }

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

      {sortedClients.map(client => {
        const isEditing = editClientId === client.id;
        const isOpen = openClientId === client.id;
        const pendingCount = countPendingBookings(client);

        return (
          <div key={client.id} className="client-card">
            {/* Ваш код карточки клиента */}
          </div>
        );
      })}
    </div>
  );
}

export default ClientsManager;
