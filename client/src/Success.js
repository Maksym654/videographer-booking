import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function Success() {
  const [status, setStatus] = useState('loading');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const savedData = localStorage.getItem('bookingFormData');
    if (!savedData) {
      console.warn('❌ Нет данных в localStorage!');
      setStatus('error');
      return;
    }

    const formData = JSON.parse(savedData);
    const sessionId = new URLSearchParams(location.search).get('session_id');
    console.log('🔁 Получен session_id:', sessionId);

    // Создание данных для бронирования без добавления payment.id
    const bookingData = {
      ...formData,
      payment: 50, // Статичная сумма
      paymentDate: new Date().toISOString(),
      stripeSessionId: sessionId,
    };

    fetch('https://videographer-booking-server.onrender.com/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData),
    })
      .then(res => {
        if (!res.ok) throw new Error(`Ошибка ${res.status}`);
        return res.json();
      })
      .then(() => {
        console.log('✅ Бронирование успешно сохранено');
        setStatus('success');
        // localStorage.removeItem('bookingFormData'); // Можно включить позже
      })
      .catch(err => {
        console.error('❌ Ошибка при сохранении брони:', err);
        setStatus('error');
      });
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
