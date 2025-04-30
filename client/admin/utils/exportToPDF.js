import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DejaVuSansBase64 } from './customFonts';

const productTranslationMap = {
  // Русский
  'Контент-съёмка (бьюти, ивенты, личные и т.д.)': 'Content Shoot (Beauty, Events, Personal, etc.)',
  'UGC': 'UGC',
  'Предметная съёмка': 'Product Shoot',
  'Экспертная съёмка': 'Expert Shoot',
  'Другое': 'Other',
  // Немецкий
  'Content-Aufnahme (Beauty, Events, Persönliches usw.)': 'Content Shoot (Beauty, Events, Personal, etc.)',
  'Produktfotografie': 'Product Shoot',
  'Expertenaufnahme': 'Expert Shoot',
  'Andere': 'Other',
  // Украинский
  'Контент-зйомка (бʼюті, івенти, особисті тощо)': 'Content Shoot (Beauty, Events, Personal, etc.)',
  'Предметна зйомка': 'Product Shoot',
  'Експертна зйомка': 'Expert Shoot',
  'Інше': 'Other'
};

export const exportClientsToPDF = (clients) => {
  const doc = new jsPDF();
  doc.addFileToVFS('DejaVuSans.ttf', DejaVuSansBase64);
  doc.addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal');
  doc.setFont('DejaVuSans');
  doc.setFontSize(16);
  doc.text('Client & Booking Archive', 14, 20);

  let y = 30;

  clients.forEach((client) => {
    if (!client.bookings || client.bookings.length === 0) return;

    doc.setFontSize(12);
    doc.text(`Client: ${client.name || '-'} | Phone: ${client.phone || '-'} | Email: ${client.email || '-'}`, 14, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [[
        'Date', 'Time', 'Service', 'Amount', 'Status',
        'Consent to Data', 'Consent to Payment', 'Consent Date'
      ]],
      body: client.bookings.map(b => [
        b.date || '-',
        `${b.startTime || '-'}-${b.endTime || '-'}`,
        productTranslationMap[b.product] || b.product || '-',
        `${b.payment || 0}€`,
        b.status === 'done' ? 'Completed' : (b.status || 'Pending'),
        b.agreePolicy ? 'Yes' : 'No',
        b.agreePrepayment ? 'Yes' : 'No',
        (b.createdAt?.split?.('T')?.[0]) || '-',
      ]),
      styles: { fontSize: 8 },
    });

    y = doc.lastAutoTable.finalY + 10;
  });

  doc.save(`client_archive_${new Date().toISOString().split('T')[0]}.pdf`);
};
