import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function Success() {
  const [status, setStatus] = useState('loading');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const sessionId = new URLSearchParams(location.search).get('session_id');
    if (!sessionId) {
      console.warn('❌ session_id не найден в URL');
      setStatus('error');
      return;
    }
  
    console.log('🔁 Получен session_id:', sessionId);
  
    // Получаем форму с сервера
    fetch(`https://videographer-booking-server.onrender.com/api/temp-booking?session_id=${sessionId}`)
      .then(res => {
        if (!res.ok) throw new Error('❌ Данные по session_id не найдены на сервере');
        return res.json();
      })
      .then((formData) => {
        const bookingData = {
          ...formData,
          payment: 50,
          paymentDate: new Date().toISOString(),
          stripeSessionId: sessionId,
        };
  
        return fetch('https://videographer-booking-server.onrender.com/api/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookingData),
        });
      })
      .then(res => {
        if (!res.ok) throw new Error(`Ошибка при сохранении брони: ${res.status}`);
        return res.json();
      })
      .then(() => {
        console.log('✅ Бронирование успешно сохранено');
        setStatus('success');
      })
      .catch(err => {
        console.error(err.message || '❌ Ошибка при обработке брони');
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
