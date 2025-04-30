const SHEET_ID = '10lXZ1QP2LmZEd5EkO5vYQN0BtIzZqi0N1wG0SIn5TIA'; // Ваш ID таблицы
const API_KEY = 'AIzaSyA35t1pAKSPpLx1zkbHo_0vEQuFPxhJZKk'; // Ваш API ключ
const SHEET_AVAILABLE = 'AvailableDates'; // Название листа с датами
const SHEET_BOOKINGS = 'Bookings'; // Название листа для броней

// Получение доступных дат
async function getAvailableDates() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_AVAILABLE}?key=${API_KEY}`;
  
  console.log('[Sheets API] Запрос к:', url);

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Ошибка HTTP: ${response.status}`);
    }

    const data = await response.json();
    console.log('[Sheets API] Ответ:', data);

    if (!data.values || data.values.length < 2) {
      console.warn('[Sheets API] Нет данных или только заголовки');
      return [];
    }

    const headers = data.values[0].map(h => h.toLowerCase());
    const result = [];

    for (let i = 1; i < data.values.length; i++) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = data.values[i][index] || '';
      });

      // Проверяем, что дата и время существуют и не забронированы
      if (row.date && row.time && row.isbooked !== 'TRUE') {
        result.push({
          date: row.date.trim(),
          time: row.time.trim()
        });
      }
    }

    console.log('[Sheets API] Доступные даты:', result);
    return result;
  } catch (error) {
    console.error('[Sheets API] Ошибка:', error);
    return [];
  }
}

// Отправка бронирования
async function submitBooking(formData) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_BOOKINGS}:append?valueInputOption=USER_ENTERED&key=${API_KEY}`;
  
  const { name, phone, product, date } = formData;
  const [bookingDate, bookingTime] = date.split(' ');

  const values = [
    [
      name,          // ClientName
      phone,         // Phone
      bookingDate,   // Date
      bookingTime,   // Time
      product,       // Notes
      'New',         // Status
      new Date().toLocaleString() // Дата бронирования
    ]
  ];

  try {
    console.log('[Sheets API] Отправка брони:', values);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка: ${errorText}`);
    }

    const result = await response.json();
    console.log('[Sheets API] Бронь успешно создана:', result);
    return result;
  } catch (error) {
    console.error('[Sheets API] Ошибка при бронировании:', error);
    throw error;
  }
}

module.exports = { getAvailableDates, submitBooking };