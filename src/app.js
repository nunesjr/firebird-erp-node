require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const allRoutes = require('./routes');
const { handleErrors } = require('./middlewares/authMiddleware');
const sqliteService = require('./services/sqliteService');

// Inicializa o banco de dados SQLite (cria tabelas se não existirem)
sqliteService.initialize().catch(err => {
    console.error('Falha fatal ao inicializar o banco de dados de usuários (SQLite). Saindo...', err);
    process.exit(1);
});

const app = express();

// --- Middlewares Globais ---
const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',');
console.log('Origins CORS permitidas:', allowedOrigins);

app.use(cors({
    origin: (origin, callback) => {
        // Permite requisições sem 'origin' (ex: Postman, apps mobile)
        if (!origin) return callback(null, true);

        if (allowedOrigins[0] === '*' || allowedOrigins.includes(origin)) {
            return callback(null, true);
        } else {
            return callback(new Error('A política de CORS para este site não permite acesso da sua origem.'));
        }
    },
}));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// --- Rota Estática para PDFs ---
// O caminho agora precisa voltar um nível, pois app.js está em src/
const PDF_FOLDER = path.join(__dirname, '..', 'pdfs');
app.use('/pdfs', express.static(PDF_FOLDER));

// --- Rotas da Aplicação ---
app.use('/', allRoutes);

// --- Middleware de Tratamento de Erros ---
// Deve ser o último middleware a ser usado
app.use(handleErrors);

module.exports = app;
