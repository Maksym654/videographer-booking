const { db } = require('./firebaseAdmin');
const { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs } = require('firebase-admin/firestore');
const { sendTelegramMessage } = require('./telegramBot');

async function createBooking(bookingData) {
  const {
    name,
    phone,
    email,
    product,
    date,
    startTime,
    endTime,
    payment = 0,
    paymentDate = '',
    status = 'Ожидается'
  } = bookingData;

  const bookingsRef = collection(db, 'bookings');
  const clientsRef = collection(db, 'clients');

  const newBooking = {
    name,
    phone,
    email,
    product,
    date,
    startTime,
    endTime,
    payment,
    paymentDate,
    status,
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(bookingsRef), newBooking);

  const clientQuery = query(clientsRef,
    where('phone', '==', phone));
  const clientSnapshot = await getDocs(clientQuery);

  let clientDoc;

  if (!clientSnapshot.empty) {
    clientDoc = clientSnapshot.docs[0];
  } else {
    const altQuery = query(clientsRef,
      where('email', '==', email));
    const altSnapshot = await getDocs(altQuery);
    if (!altSnapshot.empty) {
      clientDoc = altSnapshot.docs[0];
    }
  }

  if (clientDoc) {
    const existingData = clientDoc.data();
    const updatedBookings = [...(existingData.bookings || []), newBooking];
    await updateDoc(doc(clientsRef, clientDoc.id), {
      bookings: updatedBookings,
      totalOrders: updatedBookings.length,
      totalSum: (existingData.totalSum || 0) + payment,
    });
  } else {
    await setDoc(doc(clientsRef), {
      name,
      phone,
      email,
      bookings: [newBooking],
      totalOrders: 1,
      totalSum: payment,
    });
  }

  await sendTelegramMessage(
    `📩 Новая бронь:\n👤 ${name}\n📱 ${phone}\n✉️ ${email}\n📸 ${product}\n📅 ${date} ${startTime}–${endTime}\n💳 Оплата: ${payment}€`
  );
}

module.exports = { createBooking };
