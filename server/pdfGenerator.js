const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function generatePdf(unidade, htmlContent) {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();

  const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h2 { text-align: center; }
          footer { margin-top: 50px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <h2>Relatório de Projeção de Armazenamento - Unidade: ${unidade}</h2>
        ${htmlContent}
        <footer>Relatório gerado automaticamente em ${new Date().toLocaleString()}</footer>
      </body>
    </html>
  `;

  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfDir = path.join(__dirname, '../pdfs');
  if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir);

  const filePath = path.join(pdfDir, `relatorio-${Date.now()}.pdf`);
  await page.pdf({ path: filePath, format: 'A4', printBackground: true });

  await browser.close();
  return filePath;
}

module.exports = { generatePdf };
