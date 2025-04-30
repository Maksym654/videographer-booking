import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const ClientsList = () => {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'bookings'));
        const bookingsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setBookings(bookingsData);
      } catch (error) {
        console.error('Ошибка загрузки бронирований:', error);
      }
    };

    fetchBookings();
  }, []);

  return (
    <div>
      <h3>Список клиентов</h3>
      {bookings.length === 0 ? (
        <p>Бронирований пока нет.</p>
      ) : (
        <ul>
          {bookings.map(booking => (
            <li key={booking.id}>
              <strong>Имя:</strong> {booking.name} | 
              <strong> Телефон:</strong> {booking.phone} | 
              <strong> Услуга:</strong> {booking.product} | 
              <strong> Дата:</strong> {booking.date}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ClientsList;
