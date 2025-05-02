const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Убедись, что переменная задана в .env

const app = express();
const PORT = process.env.PORT || 4242;

app.use(cors());
app.use(express.json());

app.post('/create-checkout-session', async (req, res) => {
  const { name, email, phone, product } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email,
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Бронирование: ${product}`,
            description: `Имя: ${name}, Телефон: ${phone}`
          },
          unit_amount: 5000,
        },
        quantity: 1,
      }],
      success_url: 'https://videographer-booking-client.onrender.com/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://videographer-booking-client.onrender.com/canceled',
      metadata: { name, phone, email, product },
    });

    console.log('✅ Отправляем sessionId клиенту:', session.id);
    res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('Stripe ошибка:', error);
    res.status(500).json({ error: 'Ошибка создания Stripe-сессии' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});

const { sendTelegramMessage } = require('./telegramBot');
const { generateCalendarLink, formatDateTime } = require('./utils/calendarUtils');

app.post('/api/notify', async (req, res) => {
  const { name, phone, email, product, date, startTime, endTime } = req.body;

  try {
    const calendarLink = generateCalendarLink({
      name,
      phone,
      email,
      product,
      date,
      startTime,
      endTime
    });

    const message = `
🆕 Новый клиент оплатил бронь!
Имя: ${name}
Телефон: ${phone}
Email: ${email}
Тип: ${product}
Дата: ${formatDateTime(date, startTime)}

👉 <a href="https://videographer-booking-client.onrender.com/admin">Просмотреть</a> | 📅 <a href="${calendarLink}">Загрузить в календарь</a>
    `;

    await sendTelegramMessage(message);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Ошибка Telegram:', err);
    res.status(500).json({ error: 'Ошибка отправки Telegram' });
  }
});
// --- Firebase и Firestore ---
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, orderBy, onSnapshot } = require('firebase/firestore');
const firebaseConfig = require('./firebaseConfig.json'); // не меняем путь!
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// 🔁 Слежение за новыми бронированиями
let lastBookingId = null;

const bookingsRef = collection(db, 'bookings');
const bookingsQuery = query(bookingsRef, orderBy('createdAt', 'desc'));

onSnapshot(bookingsQuery, snapshot => {
  snapshot.docChanges().forEach(change => {
    if (change.type === 'added') {
      const booking = change.doc.data();
      const id = change.doc.id;

      if (id !== lastBookingId) {
        lastBookingId = id;

        const message = `
📬 Новая бронь:
👤 ${booking.name}
📞 ${booking.phone}
📧 ${booking.email}
📸 ${booking.product}
📅 ${booking.date} ${booking.startTime}–${booking.endTime}
💶 Оплата: ${booking.payment || 0}€
        `;

        sendTelegramMessage(message);
      }
    }
  });
});
