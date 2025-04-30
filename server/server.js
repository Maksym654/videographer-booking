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
  origin: 'https://videographer-booking-client.onrender.com',
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
      success_url: 'https://videographer-booking-client.onrender.com/success?session_id={CHECKOUT_SESSION_ID}',
cancel_url: 'https://videographer-booking-client.onrender.com/canceled',
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
