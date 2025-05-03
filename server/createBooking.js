const { db } = require('./firebaseAdmin'); // ✅
const sendTelegramNotification = require('./telegramBot');


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
      paymentAmount,
      paymentDate,
    } = data;

    const bookingRef = await db.collection('bookings').add({
      name,
      phone,
      email,
      product,
      date,
      startTime,
      endTime,
      paymentAmount: paymentAmount || 0,
      paymentDate: paymentDate || null,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    console.log(`✅ Booking created with ID: ${bookingRef.id}`);

    // 🔐 Безопасная отправка в Telegram (если упадёт — не сломает всё)
    try {
      await sendTelegramNotification(data);
      console.log('✅ Telegram notification sent');
    } catch (tgErr) {
      console.error('⚠️ Telegram send error:', tgErr.message);
    }

    return { success: true };
  } catch (err) {
    console.error('❌ Booking creation error:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = createBooking;
