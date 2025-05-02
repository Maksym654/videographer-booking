function generateCalendarLink({ name, date, startTime, endTime, phone, email, product }) {
  const start = new Date(`${date}T${startTime}`).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const end = new Date(`${date}T${endTime}`).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const text = `Съёмка: ${name}`;
  const details = `Тип: ${product}\nТелефон: ${phone}\nEmail: ${email}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(text)}&dates=${start}/${end}&details=${encodeURIComponent(details)}&sf=true`;
}

function formatDateTime(date, time) {
  const d = new Date(`${date}T${time}`);
  return d.toLocaleString('ru-DE', { dateStyle: 'long', timeStyle: 'short' });
}

module.exports = { generateCalendarLink, formatDateTime };
