import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import './ClientsManager.css';
import translations from '../translations';

const ClientsManager = () => {
  const [clients, setClients] = useState([]);
  const [expandedClientId, setExpandedClientId] = useState(null);
  const [editClientId, setEditClientId] = useState(null);
  const [formValues, setFormValues] = useState({});
  const t = translations['ru'];

  useEffect(() => {
    const fetchClients = async () => {
      const snapshot = await getDocs(collection(db, 'clients'));
      const clientsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setClients(clientsData);
    };
    fetchClients();
  }, []);

  const toggleExpand = (clientId) => {
    setExpandedClientId(expandedClientId === clientId ? null : clientId);
  };

  const handleEditClick = (client) => {
    setEditClientId(client.id);
    setFormValues({
      name: client.name,
      phone: client.phone,
      email: client.email,
    });
  };

  const handleSaveClient = async (clientId) => {
    const clientRef = doc(db, 'clients', clientId);
    await updateDoc(clientRef, {
      name: formValues.name,
      phone: formValues.phone,
      email: formValues.email,
    });
    setEditClientId(null);
    location.reload(); // обновим данные
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormValues({ ...formValues, [name]: value });
  };

  const getTotal = (bookings) =>
    bookings.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);

  const getPendingCount = (bookings) =>
    bookings.filter((b) => b.status !== 'done').length;

  const handleStatusToggle = async (clientId, bookingIndex) => {
    const updatedClients = [...clients];
    const client = updatedClients.find((c) => c.id === clientId);
    const booking = client.bookings[bookingIndex];
    booking.status = booking.status === 'done' ? 'pending' : 'done';
    setClients(updatedClients);

    await updateDoc(doc(db, 'clients', clientId), {
      bookings: client.bookings,
    });
  };

  const handleBookingChange = (clientId, index, field, value) => {
    const updatedClients = [...clients];
    updatedClients
      .find((c) => c.id === clientId)
      .bookings[index][field] = value;
    setClients(updatedClients);
  };

  const handleAddBooking = async (clientId, newBooking) => {
    if (!newBooking.product || !newBooking.amount) return;

    const updatedClients = [...clients];
    const client = updatedClients.find((c) => c.id === clientId);
    client.bookings.push({
      ...newBooking,
      status: 'pending',
    });

    await updateDoc(doc(db, 'clients', clientId), {
      bookings: client.bookings,
    });

    setClients(updatedClients);
  };

  return (
    <div className="clients-manager">
      {clients.map((client) => {
        const total = getTotal(client.bookings || []);
        const pending = getPendingCount(client.bookings || []);
        const isExpanded = expandedClientId === client.id;
        const isEditing = editClientId === client.id;

        return (
          <div key={client.id} className="client-card">
            <div className="client-summary" onClick={() => toggleExpand(client.id)}>
              <div>
                <strong>Имя:</strong> {client.name} <br />
                <strong>Телефон:</strong> {client.phone} <br />
                <strong>Email:</strong> {client.email} <br />
                <strong>Общая сумма:</strong> {total}€
              </div>
              <div>
                <span className="pending-count">
                  Ожидает заказов: {pending}
                </span>
                <br />
                <span className="total-count">Всего заказов: {client.bookings?.length || 0}</span>
              </div>
              <button
                className="edit-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditClick(client);
                }}
              >
                ✏️
              </button>
            </div>

            {isExpanded && (
              <div className="client-details">
                {isEditing && (
                  <div className="edit-fields">
                    <input
                      name="name"
                      value={formValues.name}
                      onChange={handleInputChange}
                    />
                    <input
                      name="phone"
                      value={formValues.phone}
                      onChange={handleInputChange}
                    />
                    <input
                      name="email"
                      value={formValues.email}
                      onChange={handleInputChange}
                    />
                    <button onClick={() => handleSaveClient(client.id)}>Сохранить изменения</button>
                  </div>
                )}

                <h4>Брони:</h4>
                {client.bookings?.map((b, idx) => (
                  <div key={idx} className="booking-entry">
                    <div>
                      {b.date} {b.startTime && ` ${b.startTime} - ${b.endTime || ''}`} | {b.product} |
                      <strong> Сумма: </strong> {b.amount}€
                    </div>
                    {b.paymentDate && (
                      <div className="payment-info">
                        ✅ Бронь оплачена через Stripe {b.paymentDate}, сумма: {b.paymentAmount || 50}€
                      </div>
                    )}
                    <input
                      value={b.amount}
                      onChange={(e) =>
                        handleBookingChange(client.id, idx, 'amount', e.target.value)
                      }
                    />
                    <button
                      className={b.status === 'done' ? 'done' : 'pending'}
                      onClick={() => handleStatusToggle(client.id, idx)}
                    >
                      {b.status === 'done' ? 'Обработан' : 'Ожидается'}
                    </button>
                  </div>
                ))}

                <h5>Добавить новую бронь:</h5>
                <AddBookingForm clientId={client.id} onAdd={handleAddBooking} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const AddBookingForm = ({ clientId, onAdd }) => {
  const [product, setProduct] = useState('');
  const [amount, setAmount] = useState('');

  const handleAdd = () => {
    onAdd(clientId, { product, amount });
    setProduct('');
    setAmount('');
  };

  return (
    <div className="add-booking-form">
      <input
        placeholder="Тип съёмки"
        value={product}
        onChange={(e) => setProduct(e.target.value)}
      />
      <input
        placeholder="Сумма оплаты"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button onClick={handleAdd}>Добавить бронь</button>
    </div>
  );
};

export default ClientsManager;
