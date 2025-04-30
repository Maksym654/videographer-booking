import React, { useEffect, useState } from 'react';
import { createBooking } from './services/bookingService';
import { useNavigate, useLocation } from 'react-router-dom';

function Success() {
  const [status, setStatus] = useState('loading');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const savedData = localStorage.getItem('bookingFormData');

    if (!savedData) {
      setStatus('error');
      return;
    }

    const formData = JSON.parse(savedData);
    const sessionId = new URLSearchParams(location.search).get('session_id');

    // Обогащаем данные для записи:
    const bookingData = {
      ...formData,
      payment: 50, // сумма предоплаты
      paymentDate: new Date().toISOString(), // дата оплаты
      stripeSessionId: sessionId, // ID сессии Stripe (для учёта)
    };

    createBooking(bookingData)
      .then(() => {
        setStatus('success');
        localStorage.removeItem('bookingFormData');
      })
      .catch(() => setStatus('error'));
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
