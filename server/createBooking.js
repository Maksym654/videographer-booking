const { db } = require('./firebaseAdmin');

async function createBooking(formData) {
  const {
    name, phone, email, product, dateId,
    agreePolicy, agreePrepayment,
    payment = 0,
    paymentDate = null,
    stripeSessionId = null,
  } = formData;

  const dateRef = db.collection('availabledates').doc(dateId);
  const dateSnap = await dateRef.get();
  if (!dateSnap.exists) throw new Error('Дата не найдена!');

  const dateData = dateSnap.data();

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
    agreePrepayment,
  };

  await db.collection('bookings').add({
    name,
    phone,
    email,
    ...bookingEntry
  });

  await dateRef.update({ isBooked: true });

  const clientsSnap = await db.collection('clients').get();
  const existing = clientsSnap.docs.find(doc => {
    const data = doc.data();
    return data.email === email || data.phone === phone;
  });

  if (existing) {
    const clientRef = db.collection('clients').doc(existing.id);
    const clientData = existing.data();
    const updatedBookings = [...(clientData.bookings || []), bookingEntry];
    const totalSum = updatedBookings.reduce((sum, b) => sum + (b.payment || 0), 0);
    await clientRef.update({ bookings: updatedBookings, totalSum });
  } else {
    await db.collection('clients').add({
      name, phone, email,
      bookings: [bookingEntry],
      totalSum: payment,
      status: 'pending'
    });
  }

  return true;
}

module.exports = { createBooking };
