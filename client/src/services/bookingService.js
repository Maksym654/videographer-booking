import { db } from '../firebase';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  getDoc,
  setDoc
} from 'firebase/firestore';

// Получаем только свободные даты
export const getAvailableDates = async () => {
  const q = query(collection(db, 'availabledates'), where('isBooked', '==', false));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data()
  }));
};

// Создание брони + синхронизация с clients
export const createBooking = async (formData) => {
  const {
    name,
    phone,
    email,
    product,
    dateId,
    agreePolicy,
    agreePrepayment,
    payment = 0,
    paymentDate = null,
    stripeSessionId = null
  } = formData;

  const dateRef = doc(db, 'availabledates', dateId);
  const dateSnapshot = await getDoc(dateRef);

  if (!dateSnapshot.exists()) {
    throw new Error('Дата не найдена!');
  }

  const dateData = dateSnapshot.data();

  const bookingEntry = {
    date: dateData.date,
    startTime: dateData.timeStart,
    endTime: dateData.timeEnd,
    product,
    payment,
    paymentDate,
    stripeSessionId,
    status: 'pending',
    createdAt: new Date(),
    agreePolicy,
    agreePrepayment
  };

  // Добавляем запись в bookings (если нужно)
  await addDoc(collection(db, 'bookings'), {
    name,
    phone,
    email,
    ...bookingEntry
  });

  // Помечаем дату как занятую
  await updateDoc(dateRef, { isBooked: true });

  // Проверяем клиента по email или телефону
  const clientsSnapshot = await getDocs(collection(db, 'clients'));
  const existingClient = clientsSnapshot.docs.find(docItem => {
    const data = docItem.data();
    return data.email === email || data.phone === phone;
  });

  if (existingClient) {
    const clientRef = doc(db, 'clients', existingClient.id);
    const currentData = existingClient.data();
    const updatedBookings = [...(currentData.bookings || []), bookingEntry];
    const totalSum = updatedBookings.reduce((sum, b) => sum + (b.payment || 0), 0);
    await updateDoc(clientRef, { bookings: updatedBookings, totalSum });
  } else {
    const newClientRef = doc(collection(db, 'clients'));
    await setDoc(newClientRef, {
      name,
      phone,
      email,
      bookings: [bookingEntry],
      totalSum: payment,
      status: 'pending'
    });
  }
};

// Получение всех бронирований
export const getBookings = async () => {
  const querySnapshot = await getDocs(collection(db, 'bookings'));
  return querySnapshot.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data()
  }));
};
