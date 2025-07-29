const puppeteer = require('puppeteer');
const path = require('path');

async function generatePdf(examData, results, date, chartImages = {}) {
    let browser;
    
    try {
        // Configuração do Puppeteer para produção
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
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath()
        });
        
        const page = await browser.newPage();
        
        // Configurar viewport
        await page.setViewport({ width: 1200, height: 1800 });
        
        // Criar HTML para o PDF
        const htmlContent = buildPdfHtml(examData, results, date, chartImages);
        
        // Configurar conteúdo
        await page.setContent(htmlContent, {
            waitUntil: ['domcontentloaded', 'networkidle0'],
            timeout: 30000
        });
        
        // Gerar PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '30mm',
                right: '20mm',
                bottom: '30mm',
                left: '20mm'
            },
            timeout: 30000
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

function buildPdfHtml(examData, results, date, chartImages) {
    // Calcular totais
    let totalMonthlyMB = 0;
    const examDetails = [];
    
    // Processar dados dos exames
    for (const [exam, data] of Object.entries(examData)) {
        if (data.qtd > 0) {
            const monthlyMB = data.qtd * data.size;
            totalMonthlyMB += monthlyMB;
            
            examDetails.push({
                name: exam.charAt(0).toUpperCase() + exam.slice(1),
                qtd: data.qtd,
                size: data.size.toFixed(2),
                monthlyMB: monthlyMB.toFixed(2),
                annualGB: (monthlyMB * 12 / 1024).toFixed(2)
            });
        }
    }
    
    // Ordenar exames por armazenamento (maior primeiro)
    examDetails.sort((a, b) => b.monthlyMB - a.monthlyMB);
    
    // Gerar linhas da tabela de exames
    const examsTableRows = examDetails.map(exam => `
        <tr>
            <td>${exam.name}</td>
            <td>${exam.qtd}</td>
            <td>${exam.size} MB</td>
            <td>${exam.monthlyMB} MB</td>
            <td>${exam.annualGB} GB</td>
        </tr>
    `).join('');
    
    // Processar períodos de projeção
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
    
    // Gerar linhas da tabela de resultados
    const resultsTableRows = periods.map(period => `
        <tr>
            <td>${period.label}</td>
            <td>${period.value}</td>
        </tr>
    `).join('');

    // HTML completo do relatório
    return `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Relatório PACS</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    color: #333;
                    line-height: 1.6;
                    padding: 20px;
                }
                
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                }
                
                .logo {
                    height: 70px;
                    margin-bottom: 15px;
                }
                
                h1 {
                    color: #055a71;
                    font-size: 24px;
                    margin: 10px 0;
                }
                
                h2 {
                    color: #055a71;
                    font-size: 18px;
                    margin: 25px 0 15px;
                    border-bottom: 2px solid #24cec5;
                    padding-bottom: 5px;
                }
                
                .report-info {
                    margin-bottom: 25px;
                    font-size: 14px;
                    color: #666;
                    text-align: center;
                }
                
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                    font-size: 12px;
                }
                
                th, td {
                    border: 1px solid #ddd;
                    padding: 10px;
                    text-align: left;
                }
                
                th {
                    background-color: #055a71;
                    color: white;
                    font-weight: bold;
                }
                
                tr:nth-child(even) {
                    background-color: #f9f9f9;
                }
                
                .footer {
                    margin-top: 40px;
                    font-size: 11px;
                    color: #666;
                    text-align: center;
                    border-top: 1px solid #ddd;
                    padding-top: 15px;
                }
                
                .summary {
                    background-color: #f0f8ff;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 25px 0;
                    border-left: 4px solid #24cec5;
                }
                
                .summary p {
                    margin: 8px 0;
                    font-size: 14px;
                }
                
                .highlight {
                    font-weight: bold;
                    color: #055a71;
                }
                
                .chart-container {
                    margin: 30px 0;
                    text-align: center;
                }
                
                .chart-container img {
                    max-width: 100%;
                    height: auto;
                    border: 1px solid #eee;
                    margin: 10px 0;
                }
                
                .chart-title {
                    font-weight: bold;
                    color: #055a71;
                    margin-bottom: 10px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <img src="file://${path.join(__dirname, '../public/logos/polos-logo.png')}" class="logo" alt="Polos Tecnologia">
                <h1>Relatório de Projeção de Armazenamento PACS</h1>
                <div class="report-info">
                    <p><strong>Data de geração:</strong> ${date}</p>
                </div>
            </div>
            
            <div class="summary">
                <h2>Resumo Executivo</h2>
                <p><strong>Total de armazenamento mensal:</strong> <span class="highlight">${(totalMonthlyMB / 1024).toFixed(2)} GB</span></p>
                <p><strong>Armazenamento anual projetado:</strong> <span class="highlight">${results.annual}</span></p>
            </div>
            
            <h2>Detalhes por Tipo de Exame</h2>
            <table>
                <thead>
                    <tr>
                        <th>Tipo de Exame</th>
                        <th>Quantidade Mensal</th>
                        <th>Tamanho por Exame</th>
                        <th>Armazenamento Mensal</th>
                        <th>Armazenamento Anual</th>
                    </tr>
                </thead>
                <tbody>
                    ${examsTableRows}
                </tbody>
            </table>
            
            ${chartImages.distribution ? `
            <div class="chart-container">
                <div class="chart-title">Distribuição por Tipo de Exame</div>
                <img src="${chartImages.distribution}" alt="Gráfico de Distribuição">
            </div>
            ` : ''}
            
            <h2>Projeção de Armazenamento</h2>
            <table>
                <thead>
                    <tr>
                        <th>Período</th>
                        <th>Armazenamento Projetado</th>
                    </tr>
                </thead>
                <tbody>
                    ${resultsTableRows}
                </tbody>
            </table>
            
            ${chartImages.growth ? `
            <div class="chart-container">
                <div class="chart-title">Projeção de Crescimento</div>
                <img src="${chartImages.growth}" alt="Gráfico de Crescimento">
            </div>
            ` : ''}
            
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Polos Tecnologia - Todos os direitos reservados</p>
                <p>Desenvolvido por Célio Nora Junior | Analista de Suporte Técnico</p>
            </div>
        </body>
        </html>
    `;
}

module.exports = { generatePdf };