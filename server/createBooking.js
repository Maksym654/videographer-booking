const { db } = require('./firebaseAdmin');
const { sendTelegramMessage } = require('./telegramBot');

async function createBooking(data) {
  try {
    const {
      name,
      phone,
      email,
      product,
      date,
      startTime,
      endTime,
      paymentAmount = 0,
      paymentDate = null,
      dateId // ← важно!
    } = data;

    const bookingEntry = {
      date,
      startTime,
      endTime,
      product,
      payment: paymentAmount,
      paymentDate,
      status: 'pending',
      createdAt: new Date().toISOString(),
      agreePolicy: true,
      agreePrepayment: true
    };

    // 0. Помечаем выбранную дату как занятую (если dateId есть)
    if (dateId) {
      try {
        const dateRef = db.collection('availabledates').doc(dateId);
        await dateRef.update({ isBooked: true });
        console.log('✅ Дата помечена как занятая');
      } catch (e) {
        console.warn('⚠️ Не удалось пометить дату как занятую:', e.message);
      }
    }

    // 1. Добавляем бронь в коллекцию 'bookings'
    await db.collection('bookings').add({
      name,
      phone,
      email,
      ...bookingEntry
    });

    // 2. Ищем клиента по email или телефону
    const clientsRef = db.collection('clients');
    const snapshot = await clientsRef.get();

    const existingClient = snapshot.docs.find(doc => {
      const d = doc.data();
      return d.email === email || d.phone === phone;
    });

    if (existingClient) {
      // 3. Если клиент существует — обновляем
      const clientRef = existingClient.ref;
      const clientData = existingClient.data();
      const updatedBookings = [...(clientData.bookings || []), bookingEntry];
      const totalSum = updatedBookings.reduce((sum, b) => sum + (b.payment || 0), 0);

      await clientRef.update({
        bookings: updatedBookings,
        totalSum,
        totalOrders: updatedBookings.length
      });
    } else {
      // 4. Иначе создаём нового клиента
      await clientsRef.add({
        name,
        phone,
        email,
        bookings: [bookingEntry],
        totalSum: paymentAmount,
        totalOrders: 1,
        status: 'pending'
      });
    }

   // 5. Отправляем уведомление в Telegram
   const calendarLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Съёмка+${encodeURIComponent(name)}&details=Клиент:+${encodeURIComponent(name)},+тел:+${encodeURIComponent(phone)}&dates=${date.replace(/-/g, '')}T000000Z/${date.replace(/-/g, '')}T235900Z`;
   await sendTelegramMessage(`
    📸 <b>Новая бронь</b>
    👤 Имя: ${name}
    📞 Телефон: ${phone}
    📧 Email: ${email}
    🗓 Дата: ${date} ${startTime} - ${endTime}
    📦 Услуга: ${product}
    💶 Оплата: ${paymentAmount || 0}€
    🔗 <a href="${calendarLink}">Добавить в календарь</a>
    🔎 <a href="https://videographer-booking-client.onrender.com/admin">Просмотреть</a>
    `);
    

    console.log('✅ Бронь и клиент успешно записаны');
    return { success: true };
  } catch (err) {
    console.error('❌ Ошибка при создании брони:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { createBooking };
