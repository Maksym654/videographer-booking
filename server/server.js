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

// --- Google Sheets: Свободные даты ---
app.get('/api/available-dates', async (req, res) => {
  try {
    const dates = await getAvailableDates();
    res.json(dates);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при загрузке дат' });
  }
});

// --- Stripe Checkout ---
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

// --- Запуск сервера ---
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на http://localhost:${PORT}`);
});

// --- Telegram уведомления при новой броне ---
const { sendTelegramMessage } = require('./telegramBot');
const { generateCalendarLink, formatDateTime } = require('./utils/calendarUtils');

// Firebase Admin SDK с конфигом из переменной окружения
const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const { getFirestore } = require('firebase-admin/firestore');
const firestore = getFirestore();


// Firestore: подписка на новые брони
const { collection, query, orderBy, onSnapshot } = require('firebase/firestore');
const { getFirestore } = require('firebase-admin/firestore');
const firestore = getFirestore();

let lastBookingId = null;

const bookingsRef = firestore.collection('bookings');
const bookingsQuery = bookingsRef.orderBy('createdAt', 'desc');

bookingsQuery.onSnapshot(snapshot => {
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
