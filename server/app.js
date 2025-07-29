require('dotenv').config();
const express = require('express');
const path = require('path');
const { generatePdf } = require('./pdfGenerator');

const app = express();
const PORT = process.env.PORT || 8081;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, '../views')));

// Rotas
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/index.html'));
});

app.post('/generate-pdf', async (req, res) => {
    try {
        const { examData, results, date } = req.body;
        
        // Gerar PDF
        const pdfBuffer = await generatePdf(examData, results, date);
        
        // Configurar headers para download
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=relatorio_pacs.pdf',
            'Content-Length': pdfBuffer.length
        });
        
        // Enviar PDF
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        res.status(500).send('Erro ao gerar o PDF');
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});