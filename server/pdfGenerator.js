const puppeteer = require('puppeteer');
const path = require('path');

async function generatePdf(examData, results, date) {
    let browser;
    
    try {
        // Iniciar navegador
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Criar HTML para o PDF
        const htmlContent = buildPdfHtml(examData, results, date);
        
        // Configurar conteúdo e opções
        await page.setContent(htmlContent, {
            waitUntil: 'networkidle0'
        });
        
        await page.emulateMediaType('screen');
        
        // Gerar PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '30mm',
                right: '20mm',
                bottom: '30mm',
                left: '20mm'
            }
        });
        
        return pdfBuffer;
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

function buildPdfHtml(examData, results, date) {
    // Construir tabela de exames
    let examsTableRows = '';
    let totalMonthlyMB = 0;
    
    for (const [exam, data] of Object.entries(examData)) {
        if (data.qtd > 0) {
            const monthlyMB = data.qtd * data.size;
            totalMonthlyMB += monthlyMB;
            
            examsTableRows += `
                <tr>
                    <td>${exam.charAt(0).toUpperCase() + exam.slice(1)}</td>
                    <td>${data.qtd}</td>
                    <td>${data.size.toFixed(2)} MB</td>
                    <td>${monthlyMB.toFixed(2)} MB</td>
                    <td>${(monthlyMB * 12 / 1024).toFixed(2)} GB</td>
                </tr>
            `;
        }
    }
    
    // Construir tabela de resultados
    let resultsTableRows = '';
    
    const periods = [
        { label: 'Anual', value: results.annual },
        { label: '1 Ano', value: results.year1 },
        { label: '5 Anos', value: results.year5 },
        { label: '10 Anos', value: results.year10 },
        { label: '20 Anos', value: results.year20 }
    ];
    
    if (results.custom.years && results.custom.value !== '-') {
        periods.push({
            label: `${results.custom.years} Anos`,
            value: results.custom.value
        });
    }
    
    periods.forEach(period => {
        resultsTableRows += `
            <tr>
                <td>${period.label}</td>
                <td>${period.value}</td>
            </tr>
        `;
    });
    
    // HTML completo
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
                }
                
                .header {
                    text-align: center;
                    margin-bottom: 20px;
                }
                
                .logo {
                    height: 60px;
                }
                
                h1 {
                    color: #055a71;
                    font-size: 24px;
                    margin-top: 10px;
                }
                
                h2 {
                    color: #055a71;
                    font-size: 18px;
                    margin: 20px 0 10px;
                    border-bottom: 2px solid #24cec5;
                    padding-bottom: 5px;
                }
                
                .report-info {
                    margin-bottom: 20px;
                    font-size: 14px;
                    color: #666;
                }
                
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 15px 0;
                    font-size: 14px;
                }
                
                th, td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                }
                
                th {
                    background-color: #055a71;
                    color: white;
                }
                
                tr:nth-child(even) {
                    background-color: #f2f2f2;
                }
                
                .footer {
                    margin-top: 30px;
                    font-size: 12px;
                    color: #666;
                    text-align: center;
                    border-top: 1px solid #ddd;
                    padding-top: 10px;
                }
                
                .summary {
                    background-color: #f9f9f9;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 20px 0;
                }
                
                .summary p {
                    margin: 5px 0;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <img src="file://${path.join(__dirname, '../public/logos/polos-logo.png')}" class="logo" alt="Polos Tecnologia">
                <h1>Relatório de Projeção de Armazenamento PACS</h1>
            </div>
            
            <div class="report-info">
                <p><strong>Data de geração:</strong> ${date}</p>
            </div>
            
            <div class="summary">
                <h2>Resumo Executivo</h2>
                <p><strong>Total de armazenamento mensal:</strong> ${(totalMonthlyMB / 1024).toFixed(2)} GB</p>
                <p><strong>Armazenamento anual projetado:</strong> ${results.annual}</p>
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
            
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Polos Tecnologia - Todos os direitos reservados</p>
                <p>Desenvolvido por Célio Nora Junior | Analista de Suporte Técnico</p>
            </div>
        </body>
        </html>
    `;
}

module.exports = { generatePdf };