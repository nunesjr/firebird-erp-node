const express = require('express');
const router = express.Router();
const { getTitulos } = require('../controllers/financeiroController');
const { authenticateToken, requirePermission } = require('../middlewares/authMiddleware');

// Rota para buscar os títulos financeiros
// GET /api/financeiro/titulos
router.get('/titulos', authenticateToken, requirePermission('VIEW_FINANCEIRO'), getTitulos);

module.exports = router;
