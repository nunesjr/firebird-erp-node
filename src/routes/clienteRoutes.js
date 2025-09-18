const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');
const { authenticateToken, requireCliente } = require('../middlewares/authMiddleware');

// Todas as rotas aqui são para clientes e exigem autenticação.
// O middleware `requireCliente` garante que apenas usuários com a role 'cliente' (ou 'admin') possam acessar.
router.use(authenticateToken, requireCliente);

/**
 * @route   GET /api/cliente/produtos-disponiveis
 * @desc    Retorna a lista de produtos que o cliente pode pedir.
 * @access  Private (Cliente, Admin)
 */
router.get('/produtos-disponiveis', clienteController.getProdutosDisponiveis);

/**
 * @route   GET /api/cliente/minhas-compras
 * @desc    Retorna o histórico de compras (orçamentos) do cliente logado.
 * @access  Private (Cliente, Admin)
 */
router.get('/minhas-compras', clienteController.getMinhasCompras);

/**
 * @route   GET /api/cliente/minhas-compras/:orcamentoCodigo
 * @desc    Retorna os itens de uma compra específica do cliente.
 * @access  Private (Cliente, Admin)
 */
router.get('/minhas-compras/:orcamentoCodigo', clienteController.getMinhaCompraItens);

/**
 * @route   GET /api/cliente/dashboard
 * @desc    Retorna os dados para o dashboard do cliente (ex: top produtos).
 * @access  Private (Cliente, Admin)
 */
router.get('/dashboard', clienteController.getDashboardData);

/**
 * @route   GET /api/cliente/meus-titulos
 * @desc    Retorna os títulos financeiros em aberto para o cliente logado.
 * @access  Private (Cliente, Admin)
 */
router.get('/meus-titulos', clienteController.getMeusTitulos);


// --- Rotas a serem implementadas no futuro ---

// router.get('/dashboard', clienteController.getDashboardData);
// router.get('/minhas-compras', clienteController.getMinhasCompras);
// router.post('/fazer-pedido', clienteController.createPedido);


module.exports = router;