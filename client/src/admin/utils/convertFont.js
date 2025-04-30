const fs = require('fs');
const path = require('path');

const fontPath = path.join(__dirname, '../../assets/fonts/DejaVuSans.ttf');
const outputPath = path.join(__dirname, 'customFonts.js');

const fontBuffer = fs.readFileSync(fontPath);
const base64Font = fontBuffer.toString('base64');

const output = `export const DejaVuSansBase64 = "${base64Font}";`;

fs.writeFileSync(outputPath, output);
console.log('✅ Шрифт успешно сконвертирован и сохранён в customFonts.js');
