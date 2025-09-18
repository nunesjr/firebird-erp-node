const express = require('express');
const router = express.Router();
const entregaController = require('../controllers/entregaController');
const { authenticateToken, requireAdmin, requirePermission } = require('../middlewares/authMiddleware');

// --- Rotas para Entregadores ---
// Requer autenticação de admin para gerenciar entregadores
router.get('/entregadores', authenticateToken, entregaController.getEntregadores);
router.post('/entregadores', authenticateToken, requireAdmin, entregaController.createEntregador);

// --- Rotas para Vendas (para a página de Entregas) ---
router.get('/vendas/search', authenticateToken, requirePermission('VIEW_RESUMO_VENDAS'), entregaController.searchVendas);
router.get('/vendas', authenticateToken, requirePermission('VIEW_RESUMO_VENDAS'), entregaController.getVendasParaEntrega);

// --- Rota para Salvar Dados da Entrega ---
router.post('/', authenticateToken, requireAdmin, entregaController.saveEntrega);


module.exports = router;