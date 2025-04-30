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
