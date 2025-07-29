require('dotenv').config();
const express = require('express');
const path = require('path');
const { generatePdf } = require('./pdfGenerator');
const app = express();
const PORT = process.env.PORT || 8081;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, '../views')));

// Rota principal
app.get('/', (req, res) => {
    try {
        res.sendFile(path.join(__dirname, '../views/index.html'));
    } catch (error) {
        console.error('Erro ao carregar página principal:', error);
        res.status(500).send('Erro ao carregar a página');
    }
});

// Rota para gerar PDF
app.post('/generate-pdf', async (req, res) => {
    try {
        const { examData, results, chartImages, date } = req.body;
        
        if (!examData || !results) {
            return res.status(400).json({
                success: false,
                message: 'Dados incompletos para geração do PDF'
            });
        }

        const pdfBuffer = await generatePdf(examData, results, date, chartImages);
        
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=relatorio_pacs.pdf',
            'Content-Length': pdfBuffer.length
        });
        
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao gerar o PDF',
            error: error.message
        });
    }
});

// Middleware para erros 404
app.use((req, res) => {
    res.status(404).send('Página não encontrada');
});

// Middleware para tratamento de erros
app.use((err, req, res, next) => {
    console.error('Erro interno:', err);
    res.status(500).send('Ocorreu um erro interno no servidor');
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
}).on('error', (err) => {
    console.error('Erro ao iniciar servidor:', err);
});