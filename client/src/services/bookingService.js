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

  // Добавляем запись в bookings
  await addDoc(collection(db, 'bookings'), {
    name,
    phone,
    email,
    ...bookingEntry
  });

  // Помечаем дату как занятую
  await updateDoc(dateRef, { isBooked: true });

  // Проверяем клиента
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

  // ✅ Уведомление в Telegram после успешного сохранения:
  await fetch('https://videographer-booking-server.onrender.com/api/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      phone,
      email,
      product,
      date: dateData.date,
      startTime: dateData.timeStart,
      endTime: dateData.timeEnd
    })
  });
};
export { getAvailableDates, createBooking, getBookings };
