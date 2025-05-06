import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './BookingForm.css';
import translations from './translations';
import { getAvailableDates } from './services/bookingService';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe('pk_live_51RJGQqGxtq8EnrYWbnMFqTg8tsCraBnfEj5VMktlMOiAFIhFEjDZZS98hEdNhej45nxGOosVZZFTpJeDlegoVsNC00Er8XXMkM');

function BookingForm() {
  // 👇 Новый флаг: сервер проснулся
  const [serverReady, setServerReady] = useState(false);

  // 👇 Основные данные формы
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
    // 🔧 Старый ping (закомментирован)
    // fetch('https://videographer-booking-server.onrender.com/ping')
    //   .catch((err) => console.log('Ping failed:', err));

    // ✅ Новый ping с serverReady
    fetch('https://videographer-booking-server.onrender.com/ping')
      .then(() => setServerReady(true))
      .catch(() => setServerReady(true));
  }, []);
  

  useEffect(() => {
    const fetchDates = async () => {
      const dates = await getAvailableDates();
      setAvailableDates(dates);
    };
    fetchDates();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.agreePolicy || !formData.agreePrepayment) {
      alert(t.agreementError);
      return;
    }
    if (!formData.dateId) {
      alert(t.fillError);
      return;
    }
  
    const selected = availableDates.find((d) => d.id === formData.dateId);
    if (!selected) {
      alert('Ошибка: дата не найдена');
      return;
    }
  
    const fullData = {
      ...formData,
      date: selected.date,
      startTime: selected.timeStart,
      endTime: selected.timeEnd,
      dateId: selected.id, // 🔥 обязательно добавляем
    };    
  
    try {
      // 1. Создаём Stripe-сессию
      const response = await fetch('https://videographer-booking-server.onrender.com/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullData),
        mode: 'cors',
      });
  
      const data = await response.json();
      const sessionId = data.sessionId;
  
      if (!sessionId) {
        console.error('Ошибка: sessionId не получен', data);
        alert('Ошибка: sessionId не получен');
        return;
      }
  
      // 2. Сохраняем данные формы временно
      await fetch('https://videographer-booking-server.onrender.com/api/temp-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, formData: fullData }),
        mode: 'cors',
      });
  
      // 3. Перенаправляем на Stripe
      localStorage.setItem('bookingLang', language); // сохранить выбранный язык
      const stripe = await stripePromise;
      await stripe.redirectToCheckout({ sessionId });
    } catch (error) {
      console.error('Ошибка при создании Stripe-сессии:', error);
      alert('Ошибка при создании оплаты. Попробуйте позже.');
    }
  };   

  const tileClassName = ({ date }) => {
    const formatted = date.toLocaleDateString('sv-SE');
    return availableDates.some((d) => d.date === formatted) ? 'available-date' : null;
  };

  const handleDateSelect = (selectedDate) => {
    const formatted = selectedDate.toLocaleDateString('sv-SE');
    const selected = availableDates.find((d) => d.date === formatted);
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
            next2Label={null}
            prev2Label={null}
            navigationLabel={({ date, locale }) =>
              new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date)
            }
            onClickMonth={null}
            onClickYear={null}
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

        
        <div className="server-wake-note">
          {serverReady ? (
            <span className="server-ready">{t.serverReady}</span>
          ) : (
            <span className="server-loading">
              <span className="spinner-icon">🔄</span> {t.serverConnecting}
            </span>
          )}
        </div>

        <button
          type="submit"
          className={`submit-button ${serverReady ? "" : "disabled-button"}`}
          disabled={!serverReady}>{t.book}</button>
      </form>
    </div>
  );
}

export default BookingForm;
