require('dotenv').config();
const express = require('express');
const path = require('path');
const { generatePdf } = require('./pdfGenerator');
const app = express();
const PORT = process.env.PORT || 8081;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/index.html'));
});

app.post('/generate-pdf', async (req, res) => {
    try {
        const { unidade, html } = req.body;
        if (!unidade || !html) {
            return res.status(400).json({ error: 'Dados insuficientes para gerar PDF' });
        }
        const pdfPath = await generatePdf(unidade, html);
        res.status(200).json({ message: 'PDF gerado com sucesso', file: pdfPath });
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        res.status(500).json({ error: 'Erro ao gerar o PDF' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
