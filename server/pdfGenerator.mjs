import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tabela de nomes amigáveis para PDF
const examFriendlyNames = {
  ressonancia: 'Ressonância Magnética',
  tomografia: 'Tomografia Computadorizada',
  raiox: 'Raio-X Digital',
  ultrassom: 'Ultrassom',
  densitometria: 'Densitometria Óssea',
  hemodinamica: 'Hemodinâmica',
  mamografia: 'Mamografia Digital',
  ecocardio: 'Ecocardiograma',
  endoscopia: 'Endoscopia',
  colonoscopia: 'Colonoscopia',
  broncoscopia: 'Broncoscopia'
};

export async function generatePdf(unitName, examData, results, date, chartImages = {}, calculations = {}) {
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

        const htmlContent = buildPdfHtml(unitName, examData, results, date, chartImages, logoBase64, calculations);

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

function buildPdfHtml(unitName, examData, results, date, chartImages, logoBase64, calculations = {}) {
    let totalMonthlyGB = 0;
    let totalAnnualGB = 0;
    const examDetails = [];

    // Calcular detalhes dos exames
    for (const [examId, data] of Object.entries(examData)) {
        if (data.size > 0 && data.dailyQuantity > 0) {
            const dailyMB = data.size * data.dailyQuantity;
            const monthlyMB = dailyMB * 30;
            const monthlyGB = monthlyMB / 1024;
            const annualGB = (dailyMB * 365) / 1024;
            
            totalMonthlyGB += monthlyGB;
            totalAnnualGB += annualGB;

            examDetails.push({
                name: data.displayName,
                size: data.size.toFixed(2),
                monthlyGoal: data.monthlyGoal || Math.round(data.dailyQuantity * 30),
                dailyQuantity: data.dailyQuantity.toFixed(1),
                dailyMB: dailyMB.toFixed(2),
                monthlyGB: monthlyGB.toFixed(2),
                annualGB: annualGB.toFixed(2),
                isCustom: data.isCustom || false
            });
        }
    }

    examDetails.sort((a, b) => b.monthlyGB - a.monthlyGB);

    // Gerar tabela de exames
    const examsTableRows = examDetails.map(exam => `
        <tr>
            <td>${exam.name}${exam.isCustom ? ' *' : ''}</td>
            <td class="text-right">${exam.size} MB</td>
            <td class="text-center">${exam.monthlyGoal}</td>
            <td class="text-center">${exam.dailyQuantity}</td>
            <td class="text-right">${exam.dailyMB} MB</td>
            <td class="text-right">${exam.monthlyGB} GB</td>
            <td class="text-right">${exam.annualGB} GB</td>
        </tr>
    `).join('');

    // Configurar períodos para exibição
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

    // Informações sobre margem
    let marginInfo = '';
    if (results.marginApplied) {
        const marginTypeText = results.marginType === 'progressive' ? 'Progressiva por ano' : 'Fixa para todos os períodos';
        marginInfo = `
            <div style="margin-top: 10px; padding: 12px; background-color: ${results.marginType === 'progressive' ? '#fff5f5' : '#fff9e6'}; 
                        border-radius: 6px; border: 1px solid ${results.marginType === 'progressive' ? '#fadbd8' : '#fcf3cf'}; 
                        border-left: 4px solid ${results.marginType === 'progressive' ? '#e74c3c' : '#e67e22'};">
                <strong style="color: ${results.marginType === 'progressive' ? '#e74c3c' : '#e67e22'};">Margem de Segurança Aplicada:</strong> 
                <span style="font-weight: 600; color: ${results.marginType === 'progressive' ? '#e74c3c' : '#e67e22'};">${results.marginPercentage}%</span>
                <br><small>Tipo: ${marginTypeText}</small>
            </div>
        `;
    }

    // Verificar se há exames personalizados
    const hasCustomExams = examDetails.some(exam => exam.isCustom);
    const customExamNote = hasCustomExams ? `
        <div style="margin-top: 10px; font-size: 10px; color: #7f8c8d;">
            * Exames personalizados adicionados pelo usuário
        </div>
    ` : '';

    return `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Relatório PACS - Sistema Avançado</title>
            <style>
                body { 
                    font-family: 'Poppins', Arial, sans-serif; 
                    color: #333; 
                    line-height: 1.6; 
                    padding: 0; 
                    margin: 0; 
                    font-size: 11px;
                }
                .header { 
                    text-align: center; 
                    margin-bottom: 20px; 
                    padding-top: 20px; 
                    border-bottom: 2px solid #24cec5;
                    padding-bottom: 20px;
                }
                .logo { 
                    height: 60px; 
                    margin-bottom: 10px; 
                }
                h1 { 
                    color: #055a71; 
                    font-size: 18px; 
                    margin: 5px 0 10px; 
                    font-weight: 600; 
                }
                h2 { 
                    color: #055a71; 
                    font-size: 14px; 
                    margin: 20px 0 10px; 
                    padding-bottom: 5px; 
                    border-bottom: 1px solid #24cec5; 
                    font-weight: 500; 
                }
                .report-info { 
                    margin-bottom: 15px; 
                    font-size: 10px; 
                    color: #666; 
                    background-color: #f5fbfb;
                    padding: 10px;
                    border-radius: 5px;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin: 15px 0; 
                    font-size: 9px; 
                    page-break-inside: avoid; 
                }
                th, td { 
                    border: 1px solid #ddd; 
                    padding: 5px 6px; 
                    text-align: left;
                }
                th { 
                    background-color: #055a71; 
                    color: white; 
                    font-weight: 500; 
                    text-align: center; 
                    font-size: 9px;
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                tr:nth-child(even) { background-color: #f9f9f9; }
                .footer { 
                    margin-top: 30px; 
                    font-size: 8px; 
                    color: #666; 
                    text-align: center; 
                    padding-top: 10px; 
                    border-top: 1px solid #ddd; 
                }
                .summary { 
                    background-color: #f5fbfb; 
                    padding: 15px; 
                    border-radius: 5px; 
                    margin: 20px 0; 
                    border-left: 4px solid #24cec5; 
                }
                .summary p { 
                    margin: 5px 0; 
                    font-size: 10px; 
                }
                .highlight { 
                    font-weight: 600; 
                    color: #055a71; 
                }
                .chart-container { 
                    margin: 20px 0; 
                    page-break-inside: avoid; 
                }
                .chart-container img { 
                    max-width: 100%; 
                    max-height: 350px; 
                    height: auto; 
                    margin: 10px 0; 
                    border: 1px solid #eee; 
                    display: block; 
                    border-radius: 5px;
                }
                .chart-title { 
                    font-weight: 500; 
                    color: #055a71; 
                    margin-bottom: 5px; 
                    font-size: 12px; 
                    text-align: center;
                }
                .section { 
                    margin-bottom: 20px; 
                }
                @page { 
                    margin: 20mm 15mm; 
                }
                .total-row {
                    font-weight: bold; 
                    background-color: #e8f4f8 !important;
                }
                .margin-note {
                    font-size: 9px;
                    color: #7f8c8d;
                    font-style: italic;
                    margin-top: 5px;
                }
                .custom-exam {
                    color: #3498db;
                    font-weight: 500;
                }
            </style>
        </head>
        <body>
            <div class="header">
                ${logoBase64
                    ? `<img src="${logoBase64}" class="logo" alt="Polos Tecnologia">`
                    : `<div style="font-size: 16px; color: #055a71; font-weight: bold;">Polos Tecnologia</div>`}
                <h1>Relatório de Projeção de Armazenamento PACS</h1>
                <div class="report-info">
                    <p><strong>Unidade:</strong> ${unitName}</p>
                    <p><strong>Data de geração:</strong> ${date}</p>
                    <p><strong>Versão do Sistema:</strong> 3.0 - Sistema Avançado com Metas Mensais</p>
                </div>
            </div>

            <div class="section">
                <div class="summary">
                    <h2>Resumo Executivo</h2>
                    <p><strong>Total de armazenamento mensal:</strong> <span class="highlight">${totalMonthlyGB.toFixed(2)} GB</span></p>
                    <p><strong>Armazenamento anual projetado:</strong> <span class="highlight">${results.annual}</span></p>
                    <p><strong>Quantidade de tipos de exames configurados:</strong> ${examDetails.length}</p>
                    ${marginInfo}
                </div>
            </div>

            <div class="section">
                <h2>Detalhamento por Tipo de Exame</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Tipo de Exame</th>
                            <th>Tamanho Médio (MB)</th>
                            <th>Meta Mensal</th>
                            <th>Quantidade/Dia</th>
                            <th>Armazen. Diário</th>
                            <th>Armazen. Mensal</th>
                            <th>Armazen. Anual</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${examsTableRows}
                        <tr class="total-row">
                            <td colspan="4" class="text-right"><strong>TOTAL</strong></td>
                            <td class="text-right"><strong>${(totalMonthlyGB * 1024 / 30).toFixed(2)} MB/dia</strong></td>
                            <td class="text-right"><strong>${totalMonthlyGB.toFixed(2)} GB</strong></td>
                            <td class="text-right"><strong>${totalAnnualGB.toFixed(2)} GB</strong></td>
                        </tr>
                    </tbody>
                </table>
                ${customExamNote}
                <div class="margin-note">
                    Nota: A quantidade diária é calculada automaticamente a partir da meta mensal (Meta Mensal ÷ 30 dias)
                </div>
            </div>

            ${chartImages.distribution ? `
            <div class="section chart-container">
                <div class="chart-title">Distribuição por Tipo de Exame (Armazenamento Mensal)</div>
                <img src="${chartImages.distribution}" alt="Gráfico de Distribuição de Exames">
            </div>` : ''}

            <div class="section">
                <h2>Projeção de Armazenamento com Margem de Segurança</h2>
                ${results.marginApplied ? `
                <div class="margin-note">
                    Valores incluem margem de segurança de ${results.marginPercentage}% 
                    (${results.marginType === 'progressive' ? 'aplicada progressivamente por ano' : 'aplicada igualmente a todos os períodos'})
                </div>
                ` : ''}
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
                            <td class="text-right"><strong>${period.value}</strong></td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>

            ${chartImages.growth ? `
            <div class="section chart-container">
                <div class="chart-title">Projeção de Crescimento do Armazenamento</div>
                <img src="${chartImages.growth}" alt="Gráfico de Projeção de Crescimento">
            </div>` : ''}

            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Polos Tecnologia - Todos os direitos reservados</p>
                <p>Desenvolvido por Célio Nora Junior | Analista de Suporte Técnico</p>
                <p><small>Relatório gerado automaticamente pelo Sistema de Dimensionamento PACS v3.0 - Sistema Avançado</small></p>
                <p><small>Este relatório considera: Tamanhos médios de exames, metas mensais configuráveis, margem de segurança e projeções personalizadas</small></p>
            </div>
        </body>
        </html>
    `;
}