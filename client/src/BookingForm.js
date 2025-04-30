import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './BookingForm.css';
import translations from './translations';
import { getAvailableDates } from './services/bookingService';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe('pk_test_51RJGQqGxtq8EnrYWvJDGwcixbAOseYMlOeRoPXRNZlBDMlmqOZwZQeZvoviA6rhkshmUcVuCTvW9tAjkZZVs5aTF00fn7m4ulh');

function BookingForm() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    product: '',
    dateId: null,
    agreePolicy: false,
    agreePrepayment: false,
  });
  const [availableDates, setAvailableDates] = useState([]);
  const [language, setLanguage] = useState('de');
  const t = translations[language];
  const selectedDate = availableDates.find((d) => d.id === formData.dateId);

  const localeMap = {
    de: 'de-DE',
    en: 'en-US',
    ru: 'ru-RU',
    ua: 'uk-UA',
  };

  useEffect(() => {
    const fetchDates = async () => {
      const dates = await getAvailableDates();
      console.log('📅 Загруженные даты:', dates);
      setAvailableDates(dates);
    };
    fetchDates();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('📨 Отправка формы начата:', formData);

    if (!formData.agreePolicy || !formData.agreePrepayment) {
      alert(t.agreementError);
      return;
    }
    if (!formData.dateId) {
      alert(t.fillError);
      return;
    }

    try {
      localStorage.setItem('bookingFormData', JSON.stringify(formData));
      console.log('📤 Отправка на сервер:', formData);

      const response = await fetch('https://videographer-booking-server.onrender.com/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData),
        mode: 'cors',
      });

      const data = await response.json();
      console.log('📦 Ответ от сервера:', data);

      const stripe = await stripePromise;
      if (!stripe) {
        alert('Stripe не загрузился');
        return;
      }

      if (!data.sessionId) {
        alert('Ошибка: sessionId не получен от сервера');
        return;
      }

      console.log('➡️ Переход к Stripe:', data.sessionId);
      const result = await stripe.redirectToCheckout({ sessionId: data.sessionId });

      if (result?.error) {
        console.error('Ошибка Stripe:', result.error.message);
        alert('Ошибка: ' + result.error.message);
      }
    } catch (error) {
      console.error('❌ Ошибка при создании Stripe-сессии:', error);
      alert('Ошибка при создании оплаты. Попробуйте позже.');
    }
  };

  const tileClassName = ({ date }) => {
    const formatted = date.toISOString().split('T')[0];
    return availableDates.some((d) => d.date === formatted) ? 'available-date' : null;
  };

  const handleDateSelect = (selectedDate) => {
    const formatted = selectedDate.toISOString().split('T')[0];
    const selected = availableDates.find((d) => d.date === formatted);
    console.log('🗓 Выбрана дата:', selected);
    setFormData({
      ...formData,
      dateId: selected ? selected.id : null,
    });
  };

  return (
    <div className="booking-container">
      <h2 className="booking-title">{t.title}</h2>

      <div className="language-selector">
        {Object.keys(translations).map((lang) => (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            className={language === lang ? 'active-lang' : ''}
          >
            {lang.toUpperCase()}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="booking-form">
        {/* ... остальные поля остаются без изменений ... */}
        <button type="submit" className="submit-button">
          {t.book}
        </button>
      </form>
    </div>
  );
}

export default BookingForm;
