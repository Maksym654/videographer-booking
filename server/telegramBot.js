const axios = require('axios');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_IDS = process.env.TELEGRAM_CHAT_IDS.split(',');

async function sendTelegramMessage(text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  for (const chatId of TELEGRAM_CHAT_IDS) {
    try {
      await axios.post(url, {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      });
      console.log(`✅ Отправлено в Telegram: ${chatId}`);
    } catch (err) {
      console.error(`❌ Ошибка Telegram (${chatId}):`, err.message);
    }
  }
}

module.exports = { sendTelegramMessage };
