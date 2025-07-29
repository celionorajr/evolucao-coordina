const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function generatePDF(htmlContent, outputPath) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '40px', bottom: '60px', left: '30px', right: '30px' }
  });
  await browser.close();
}

if (require.main === module) {
  const htmlPath = path.join(__dirname, '../views/index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const outputPath = path.join(__dirname, '../reports/relatorio.pdf');

  generatePDF(html, outputPath).then(() => {
    console.log('PDF gerado com sucesso:', outputPath);
  });
}

module.exports = generatePDF;