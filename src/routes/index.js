const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');

// --- Importa os roteadores ---
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const firebirdRoutes = require('./firebirdRoutes');
const rdpRoutes = require('./rdpRoutes');
const clienteRoutes = require('./clienteRoutes');
const financeiroRoutes = require('./financeiroRoutes');
const conferenciaRoutes = require('./conferenciaRoutes'); // Importa as novas rotas
const entregaRoutes = require('./entregaRoutes');
const produtoRoutes = require('./produtoRoutes'); // Adicionando a nova rota

// --- ROTAS PÚBLICAS ---
// Rotas que NÃO exigem token de autenticação.
router.use('/api', authRoutes); // Contém /login, etc.

// Rota pública de Health Check
router.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// --- APLICAÇÃO DO MIDDLEWARE DE AUTENTICAÇÃO ---
// Todas as rotas definidas ABAIXO desta linha exigirão um token válido.
router.use('/api', authenticateToken);

// --- ROTAS PROTEGIDAS ---
// Rotas que agora estão protegidas pelo authenticateToken.
router.use('/api/users', userRoutes);
router.use('/api', firebirdRoutes);
router.use('/api', rdpRoutes); // CORRIGIDO: Rotas de RDP agora são parte da API e protegidas
router.use('/api/cliente', clienteRoutes);
router.use('/api/financeiro', financeiroRoutes);
router.use('/api/conferencia', conferenciaRoutes); // Registra as novas rotas
router.use('/api/entregas', entregaRoutes);
router.use('/api/produtos', produtoRoutes); // Adicionando a nova rota

module.exports = router;
