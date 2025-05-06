const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');
const { getAvailableDates } = require('./googleSheets');
require('dotenv').config();

const app = express();
const PORT = 4242;
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const { createBooking } = require('./createBooking');

// CORS
app.use(cors({
  origin: [
    'http://localhost:3000',  // Локальная разработка
    'https://videographer-booking-client.onrender.com'  // Домен на Render.com
  ],
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
  const { name, email, phone, product, date, startTime, endTime, dateId } = req.body;

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
      metadata: { name, phone, email, product, date, startTime, endTime, dateId },
    });

    res.status(200).json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe ошибка:', error);
    res.status(500).json({ error: 'Ошибка создания Stripe-сессии' });
  }
});

// --- Сохранение брони ---
app.post('/api/book', async (req, res) => {
  try {
    await createBooking(req.body);
    res.status(200).json({ message: 'Booking saved' });
  } catch (err) {
    console.error('❌ Ошибка при сохранении брони:', err);
    res.status(500).json({ error: 'Ошибка при сохранении брони' });
  }
});

// --- 🔁 Новый способ: получаем данные напрямую из Stripe metadata ---
app.get('/api/session-details', async (req, res) => {
  const sessionId = req.query.session_id;
  if (!sessionId) return res.status(400).json({ error: 'Missing session_id' });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    res.status(200).json({ metadata: session.metadata });
  } catch (err) {
    console.error('❌ Ошибка получения session:', err);
    res.status(500).json({ error: 'Ошибка при получении данных из Stripe' });
  }
});

/*
// --- ВРЕМЕННОЕ ХРАНИЛИЩЕ ДЛЯ bookingFormData (больше не используется) ---
const tempBookings = new Map();

app.post('/api/temp-booking', (req, res) => {
  const { sessionId, formData } = req.body;
  if (!sessionId || !formData) return res.status(400).json({ error: 'Missing data' });

  tempBookings.set(sessionId, formData);
  res.status(200).json({ message: 'Saved temporarily' });
});

app.get('/api/temp-booking', (req, res) => {
  const sessionId = req.query.session_id;
  if (!sessionId || !tempBookings.has(sessionId)) {
    return res.status(404).json({ error: 'Not found' });
  }

  const formData = tempBookings.get(sessionId);
  res.status(200).json(formData);
});
*/
// --- ПИНГ для "разбуживания" сервера ---
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// --- Запуск сервера ---
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на http://localhost:${PORT}`);
});

// --- УДАЛЯЕМ ЛОГИКУ ОТПРАВКИ УВЕДОМЛЕНИЙ В TELEGRAM ---
