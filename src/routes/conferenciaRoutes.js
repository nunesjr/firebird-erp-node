const express = require('express');
const router = express.Router();
const { toggleConferenciaStatus, getConferenciaStatuses } = require('../controllers/conferenciaController');
const { authenticateToken, requirePermission } = require('../middlewares/authMiddleware'); // Protegendo a rota

// Rota para alternar o status de conferência de uma venda
// PUT /api/conferencia/toggle
// A rota espera um corpo de requisição com { "dav_codigo": 123 }
router.put('/toggle', authenticateToken, requirePermission('VIEW_RESUMO_VENDAS'), toggleConferenciaStatus);

// Rota para buscar os status de conferência de múltiplas vendas
// POST /api/conferencia/statuses
// A rota espera um corpo de requisição com { "davCodigos": [123, 124, 125] }
router.post('/statuses', authenticateToken, requirePermission('VIEW_RESUMO_VENDAS'), getConferenciaStatuses);

module.exports = router;