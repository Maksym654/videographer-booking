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
      console.log('📅 Загруженные даты:', dates); // ЛОГ для проверки
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
  
      console.log('📥 Ответ от сервера:', response);
  
      const data = await response.json();
      console.log('📦 Получен ответ от сервера:', data);
      
      const stripe = await stripePromise;
      
      if (!stripe) {
        console.error('Stripe не загрузился!');
        alert('Платёжная система не готова. Попробуйте позже.');
        return;
      }
      
      if (!data.sessionId) {
        console.error('❗ sessionId отсутствует в ответе сервера!');
        alert('Ошибка: sessionId не получен. Проверь сервер.');
        return;
      }
      
      console.log('➡️ Переход к Stripe с sessionId:', data.sessionId);
      
      const result = await stripe.redirectToCheckout({ sessionId: data.sessionId });
      
      if (result?.error) {
        console.error('Ошибка при переходе в Stripe:', result.error);
        alert('Ошибка при переходе к оплате: ' + result.error.message);
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
    console.log('🗓 Выбрана дата:', formatted, '=>', selected); // ЛОГ
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
        <div className="form-group">
          <label>{t.name}:</label>
          <input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>{t.phone}:</label>
          <input
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>E-Mail:</label>
          <input
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>{t.type}:</label>
          <select
            value={formData.product}
            onChange={(e) => setFormData({ ...formData, product: e.target.value })}
            required
          >
            <option value="">--</option>
            {t.types.map((type, idx) => (
              <option key={idx} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>{t.date}:</label>
          <Calendar
            onChange={handleDateSelect}
            tileClassName={tileClassName}
            minDate={new Date()}
            maxDate={new Date(new Date().setMonth(new Date().getMonth() + 2))}
            locale={localeMap[language]}
          />
        </div>

        {selectedDate && selectedDate.timeStart && selectedDate.timeEnd && (
          <div className="selected-time">
            {t.availableTime}: {selectedDate.timeStart} - {selectedDate.timeEnd}
          </div>
        )}

        <div className="agreement-block">
          <label className="inline-policy">
            <input
              type="checkbox"
              checked={formData.agreePolicy}
              onChange={(e) => setFormData({ ...formData, agreePolicy: e.target.checked })}
            />
            <span>
              {(() => {
                const keyword =
                  language === 'de' ? 'der Datenverarbeitung zu' :
                  language === 'en' ? 'the data processing policy' :
                  language === 'ua' ? 'політикою обробки даних' :
                  'политикой обработки данных';

                const parts = t.agreeData.split(keyword);
                return (
                  <>
                    {parts[0]}
                    <details className="inline-details">
                      <summary className="inline-summary">{keyword}</summary>
                      <div className="inline-policy-text">{t.policy}</div>
                    </details>
                    {parts[1] || ''}
                  </>
                );
              })()}
            </span>
          </label>

          <label>
            <input
              type="checkbox"
              checked={formData.agreePrepayment}
              onChange={(e) => setFormData({ ...formData, agreePrepayment: e.target.checked })}
            />
            <span>{t.agreePayment}</span>
          </label>
        </div>

        <button type="submit" className="submit-button">
          {t.book}
        </button>
      </form>
    </div>
  );
}

export default BookingForm;
