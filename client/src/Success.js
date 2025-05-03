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

    console.log('✅ session_id найден:', sessionId);

    const fetchSession = async () => {
      try {
        const res = await fetch(`https://videographer-booking-server.onrender.com/api/session-details?session_id=${sessionId}`);
        const data = await res.json();
        console.log('✅ session-details data:', data);

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

  // Старый return — временно закомментирован
  /*
  if (status === 'loading') return <h2>Загрузка...</h2>;
  if (status === 'success') return <h2>✅ Спасибо! Бронь успешно сохранена. Возврат на главную через 3 секунды...</h2>;
  return <h2>⚠️ Ошибка! Попробуйте позже.</h2>;
  */

  const lang = localStorage.getItem('bookingLang') || 'de';
  const messages = {
    de: {
      text: '✅ Danke! Ihre Buchung war erfolgreich. Wir werden Sie kontaktieren. Bei Fragen schreiben Sie mir:',
      telegram: 'Telegram',
      whatsapp: 'WhatsApp',
    },
    en: {
      text: '✅ Thank you! Your booking was successful. We will contact you. If you have any questions, feel free to contact me:',
      telegram: 'Telegram',
      whatsapp: 'WhatsApp',
    },
    ru: {
      text: '✅ Спасибо! Бронь успешно. Мы с вами свяжемся. Если есть вопросы — напишите мне:',
      telegram: 'Телеграм',
      whatsapp: 'Ватсап',
    },
    ua: {
      text: '✅ Дякуємо! Бронювання успішне. Ми з вами зв’яжемось. Якщо є питання — напишіть мені:',
      telegram: 'Телеграм',
      whatsapp: 'Ватсап',
    }
  };
  const m = messages[lang];

  useEffect(() => {
    if (status === 'success') {
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    }
  }, [status]);

  if (status === 'loading') return <h2>Загрузка...</h2>;

  if (status === 'success') {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p>{m.text}</p>
        <p>
          <a
            href="https://t.me/hanna_dzhos"
            target="_blank"
            rel="noopener noreferrer"
            style={{ marginRight: '1rem' }}
          >
            📲 {m.telegram}
          </a>
          <a
            href="https://wa.me/491722324094"
            target="_blank"
            rel="noopener noreferrer"
          >
            💬 {m.whatsapp}
          </a>
        </p>
      </div>
    );
  }

  return <h2>⚠️ Ошибка! Попробуйте позже.</h2>;
}

export default Success;
