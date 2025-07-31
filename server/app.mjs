import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { generatePdf } from './pdfGenerator.mjs';


// Configuração de caminhos
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8081;

// Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));


// Rota do favicon 
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/favicon.ico'));
});

// Rotas
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/index.html'));
});

app.post('/generate-pdf', async (req, res) => {
    try {
        const { unitName, examData, results, chartImages, date } = req.body;
        
        if (!unitName || !examData || !results) {
            return res.status(400).json({
                success: false,
                message: 'Dados incompletos para geração do PDF'
            });
        }

        const pdfBuffer = await generatePdf(unitName, examData, results, date, chartImages);
        
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=relatorio_pacs_${unitName.replace(/\s+/g, '_')}.pdf`,
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

// Tratamento de erros
app.use((req, res) => {
    res.status(404).send('Página não encontrada');
});

app.use((err, req, res, next) => {
    console.error('Erro interno:', err);
    res.status(500).send('Ocorreu um erro interno no servidor');
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Modo: ${process.env.NODE_ENV || 'development'}`);
});