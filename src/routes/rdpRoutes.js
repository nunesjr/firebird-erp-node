const express = require('express');
const router = express.Router();
const rdpController = require('../controllers/rdpController');
const { authenticateToken, requirePermission } = require('../middlewares/authMiddleware');

// Rota para Liberar RDP (requer autenticação e permissão)
router.post('/liberar-rdp', authenticateToken, requirePermission('VIEW_LIBERAR_RDP'), rdpController.liberarRdp);

module.exports = router;
