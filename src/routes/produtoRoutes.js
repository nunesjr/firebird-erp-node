const express = require('express');
const router = express.Router();
const produtoController = require('../controllers/produtoController');

// A rota já está protegida pelo middleware de autenticação global em /src/routes/index.js
router.get('/precos', produtoController.getPrecosVenda);

module.exports = router;
