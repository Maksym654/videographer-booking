import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function Success() {
  const [status, setStatus] = useState('loading');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const submitBooking = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');
      if (!sessionId) return;

      try {
        const stripeRes = await fetch(`https://videographer-booking-server.onrender.com/api/checkout-session?session_id=${sessionId}`);
        const stripeData = await stripeRes.json();
        const metadata = stripeData?.metadata;

        if (!metadata) throw new Error('Отсутствует metadata из Stripe session');

        const bookingData = {
          name: metadata.name || '',
          phone: metadata.phone || '',
          email: metadata.email || '',
          product: metadata.product || '',
          date: metadata.date || null,
          startTime: metadata.startTime || '',
          endTime: metadata.endTime || '',
          paymentAmount: 50,
          paymentDate: new Date().toISOString(),
        };

        console.log('📦 bookingData to server:', bookingData);

        if (!bookingData.date) throw new Error('❌ Дата брони не получена из metadata');

        const res = await fetch('https://videographer-booking-server.onrender.com/api/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookingData),
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        console.log('✅ Booking saved successfully');
        setStatus('success');
      } catch (error) {
        console.error('❌ Ошибка при сохранении брони:', error.message);
        setStatus('error');
      }
    };

    submitBooking();
  }, [location.search]);

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div style={{ padding: '30px', textAlign: 'center' }}>
      {status === 'loading' && <p>Обработка бронирования...</p>}
      {status === 'success' && (
        <>
          <h2>✅ Спасибо! Оплата прошла успешно.</h2>
          <p>Бронирование сохранено, мы свяжемся с вами в ближайшее время.</p>
          <button onClick={handleBack}>Вернуться</button>
        </>
      )}
      {status === 'error' && (
        <>
          <h2>⚠️ Что-то пошло не так...</h2>
          <p>Попробуйте позже или свяжитесь с нами напрямую.</p>
          <button onClick={handleBack}>Вернуться</button>
        </>
      )}
    </div>
  );
}

export default Success;
