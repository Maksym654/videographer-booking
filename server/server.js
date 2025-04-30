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
