import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function generatePdf(unitName, examData, results, date, chartImages = {}) {
    let browser;
    
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process'
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath(),
            timeout: 60000
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 1800, deviceScaleFactor: 2 });

        const logoPath = path.join(__dirname, '../public/logos/polos-logo.png');
        let logoBase64 = '';

        try {
            const logoFile = fs.readFileSync(logoPath);
            logoBase64 = `data:image/png;base64,${logoFile.toString('base64')}`;
        } catch (error) {
            console.warn('⚠️ Logo não encontrada. Verifique o caminho:', logoPath);
            console.error('Erro ao carregar a logo:', error.message);
        }

        const htmlContent = buildPdfHtml(unitName, examData, results, date, chartImages, logoBase64);

        await page.setContent(htmlContent, {
            waitUntil: ['domcontentloaded', 'networkidle0'],
            timeout: 60000
        });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                right: '15mm',
                bottom: '20mm',
                left: '15mm'
            },
            timeout: 60000
        });

        return pdfBuffer;
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        throw new Error('Falha na geração do PDF: ' + error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

function buildPdfHtml(unitName, examData, results, date, chartImages, logoBase64) {
    const dailyAverages = {
        ressonancia: 10,
        tomografia: 65,
        raiox: 60,
        ultrassom: 50,
        densitometria: 10,
        hemodinamica: 10
    };

    let totalMonthlyGB = 0;
    const examDetails = [];

    for (const [exam, data] of Object.entries(examData)) {
        if (data.size > 0) {
            const dailyMB = data.size * dailyAverages[exam];
            const monthlyMB = dailyMB * 30;
            const monthlyGB = monthlyMB / 1024;
            const annualGB = (dailyMB * 365) / 1024;
            
            totalMonthlyGB += monthlyGB;

            examDetails.push({
                name: exam.charAt(0).toUpperCase() + exam.slice(1),
                size: data.size.toFixed(2),
                dailyAvg: dailyAverages[exam],
                dailyMB: dailyMB.toFixed(2),
                monthlyGB: monthlyGB.toFixed(2),
                annualGB: annualGB.toFixed(2)
            });
        }
    }

    examDetails.sort((a, b) => b.monthlyGB - a.monthlyGB);

    const examsTableRows = examDetails.map(exam => `
        <tr>
            <td>${exam.name}</td>
            <td class="text-right">${exam.size} MB</td>
            <td class="text-center">${exam.dailyAvg}</td>
            <td class="text-right">${exam.dailyMB} MB</td>
            <td class="text-right">${exam.monthlyGB} GB</td>
            <td class="text-right">${exam.annualGB} GB</td>
        </tr>
    `).join('');

    const periods = [
        { label: 'Anual', value: results.annual },
        { label: '1 Ano', value: results.year1 },
        { label: '5 Anos', value: results.year5 },
        { label: '10 Anos', value: results.year10 },
        { label: '20 Anos', value: results.year20 }
    ];

    if (results.custom?.years && results.custom?.value !== '-') {
        periods.push({
            label: `${results.custom.years} Anos`,
            value: results.custom.value
        });
    }

    return `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Relatório PACS</title>
            <style>
                /* Estilos mantidos iguais ao seu original */
                body { font-family: 'Poppins', Arial, sans-serif; color: #333; line-height: 1.6; padding: 0; margin: 0; }
                .header { text-align: center; margin-bottom: 20px; padding-top: 20px; }
                .logo { height: 60px; margin-bottom: 10px; }
                h1 { color: #055a71; font-size: 22px; margin: 5px 0 15px; font-weight: 600; }
                h2 { color: #055a71; font-size: 16px; margin: 25px 0 10px; padding-bottom: 5px; border-bottom: 2px solid #24cec5; font-weight: 500; }
                .report-info { margin-bottom: 20px; font-size: 12px; color: #666; }
                table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 11px; page-break-inside: avoid; }
                th, td { border: 1px solid #ddd; padding: 8px 10px; }
                th { background-color: #055a71; color: white; font-weight: 500; text-align: center; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                tr:nth-child(even) { background-color: #f9f9f9; }
                .footer { margin-top: 30px; font-size: 10px; color: #666; text-align: center; padding-top: 10px; border-top: 1px solid #ddd; }
                .summary { background-color: #f5fbfb; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #24cec5; }
                .summary p { margin: 5px 0; font-size: 12px; }
                .highlight { font-weight: 600; color: #055a71; }
                .chart-container { margin: 25px 0; page-break-inside: avoid; }
                .chart-container img { max-width: 100%; max-height: 450px; height: auto; margin: 10px 0; border: 1px solid #eee; display: block; }
                .chart-title { font-weight: 500; color: #055a71; margin-bottom: 5px; font-size: 14px; }
                .section { margin-bottom: 30px; }
                @page { margin: 20mm 15mm; }
            </style>
        </head>
        <body>
            <div class="header">
                ${logoBase64
                    ? `<img src="${logoBase64}" class="logo" alt="Polos Tecnologia">`
                    : `<div style="font-size: 18px; color: #055a71; font-weight: bold;">Polos Tecnologia</div>`}
                <h1>Relatório de Projeção de Armazenamento PACS</h1>
                <div class="report-info">
                    <p><strong>Unidade:</strong> ${unitName}</p>
                    <p><strong>Data de geração:</strong> ${date}</p>
                </div>
            </div>

            <div class="section">
                <div class="summary">
                    <h2>Resumo Executivo</h2>
                    <p><strong>Total de armazenamento mensal:</strong> <span class="highlight">${totalMonthlyGB.toFixed(2)} GB</span></p>
                    <p><strong>Armazenamento anual projetado:</strong> <span class="highlight">${results.annual}</span></p>
                </div>
            </div>

            <div class="section">
                <h2>Detalhes por Tipo de Exame</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Tipo de Exame</th>
                            <th>Tamanho (MB)</th>
                            <th>Média Diária</th>
                            <th>Armazen. Diário</th>
                            <th>Armazen. Mensal</th>
                            <th>Armazen. Anual</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${examsTableRows}
                    </tbody>
                </table>
            </div>

            ${chartImages.distribution ? `
            <div class="section chart-container">
                <div class="chart-title">Distribuição por Tipo de Exame</div>
                <img src="${chartImages.distribution}" alt="Gráfico de Distribuição">
            </div>` : ''}

            <div class="section">
                <h2>Projeção de Armazenamento</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Período</th>
                            <th>Armazenamento Projetado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${periods.map(period => `
                        <tr>
                            <td>${period.label}</td>
                            <td class="text-right">${period.value}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>

            ${chartImages.growth ? `
            <div class="section chart-container">
                <div class="chart-title">Projeção de Crescimento</div>
                <img src="${chartImages.growth}" alt="Gráfico de Crescimento">
            </div>` : ''}

            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Polos Tecnologia - Todos os direitos reservados</p>
                <p>Desenvolvido por Célio Nora Junior | Analista de Suporte Técnico</p>
            </div>
        </body>
        </html>
    `;
}