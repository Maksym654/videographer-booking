const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');
const { getAvailableDates } = require('./googleSheets');
require('dotenv').config();

const app = express();
const PORT = 4242;
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// CORS
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST']
}));

app.use(express.json());

// Свободные даты
app.get('/api/available-dates', async (req, res) => {
  try {
    const dates = await getAvailableDates();
    res.json(dates);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при загрузке дат' });
  }
});

// Stripe Checkout
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
          product_data: { name: `Бронирование: ${product}`, description: `Имя: ${name}, Телефон: ${phone}` },
          unit_amount: 5000,
        },
        quantity: 1,
      }],
      success_url: 'http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'http://localhost:3000/canceled',
      metadata: { name, phone, email, product },
    });

    res.status(200).json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe ошибка:', error);
    res.status(500).json({ error: 'Ошибка создания Stripe-сессии' });
  }
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на http://localhost:${PORT}`);
});
// --- 🔔 Telegram уведомление при добавлении новой брони ---
const { sendTelegramMessage } = require('./telegramBot');
const { generateCalendarLink, formatDateTime } = require('./utils/calendarUtils');

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, orderBy, onSnapshot } = require('firebase/firestore');

const firebaseConfig = require('./firebaseConfig.json'); // путь не менять!
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

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
