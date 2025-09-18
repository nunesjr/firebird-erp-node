const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, requireAdmin } = require('../middlewares/authMiddleware');

// --- Rotas Públicas (Autenticação) ---
router.post('/login', authController.login);
// A rota de registro público foi removida para usar apenas o registro via admin.

// --- Rotas de Admin para Registro ---
// REATIVADO: Proteção para a rota de registro de admin.
router.post('/admin/register', authenticateToken, requireAdmin, authController.registerAdmin);

// --- Rota para Verificar Token ---
router.get('/verify-token', authenticateToken, authController.verifyToken);

module.exports = router;