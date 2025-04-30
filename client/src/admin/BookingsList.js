import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

function BookingsList() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBookings(bookingsData);
    });

    return () => unsubscribe();
  }, []);

  const formatDate = (dateInput) => {
    if (!dateInput) return 'Дата не указана';
  
    // Если это Firestore Timestamp, преобразуем в Date
    const dateObj = dateInput instanceof Date
      ? dateInput
      : new Date(dateInput?.seconds ? dateInput.seconds * 1000 : dateInput);
  
    if (isNaN(dateObj)) return 'Неверная дата';
  
    return dateObj.toLocaleDateString('ru-RU');
  };
  
  
  
  return (
    <div>
      <h2>Список клиентов</h2>
      {bookings.length === 0 ? (
        <p>Бронирований пока нет.</p>
      ) : (
        <ol>
          {bookings.map((booking, index) => (
            <li key={booking.id} style={{ marginBottom: '10px' }}>
              <div><strong>Имя:</strong> {booking.name}</div>
              <div><strong>Телефон:</strong> {booking.phone}</div>
              <div><strong>Услуга:</strong> {booking.product}</div>
              <div><strong>Дата:</strong> {formatDate(booking.date)}</div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default BookingsList;
