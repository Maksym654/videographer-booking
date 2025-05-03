import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

function Success() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      setStatus('error');
      return;
    }

    const fetchSession = async () => {
      try {
        const res = await fetch(`https://videographer-booking-server.onrender.com/api/session-details?session_id=${sessionId}`);
        const data = await res.json();

        if (!data.metadata) throw new Error('Metadata not found');

        const bookingRes = await fetch('https://videographer-booking-server.onrender.com/api/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data.metadata,
            paymentAmount: 50,
            paymentDate: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            status: 'pending'
          })
        });

        if (!bookingRes.ok) throw new Error('Booking save failed');

        setStatus('success');
      } catch (error) {
        console.error('❌ Ошибка на Success:', error);
        setStatus('error');
      }
    };

    fetchSession();
  }, [searchParams]);

  if (status === 'loading') return <h2>Загрузка...</h2>;
  if (status === 'success') return <h2>✅ Спасибо! Бронь успешно сохранена.</h2>;
  return <h2>⚠️ Ошибка! Попробуйте позже.</h2>;
}

export default Success;
