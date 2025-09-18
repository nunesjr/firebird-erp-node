const express = require('express');
const router = express.Router();
const firebirdController = require('../controllers/firebirdController');
const { authenticateToken, requirePermission } = require('../middlewares/authMiddleware');

// Todas as rotas neste arquivo requerem autenticação
router.use(authenticateToken);

router.get('/produtos', requirePermission('VIEW_CUSTO_REPOSICAO'), firebirdController.getProdutosCustoReposicao);
router.get('/estoque', requirePermission('VIEW_ESTOQUE_NEGATIVO'), firebirdController.getEstoque);
router.get('/tabela-precos/:codigoCliente', requirePermission('VIEW_TABELA_PRECOS'), firebirdController.getTabelaPrecos);
router.get('/resumo-vendas', requirePermission('VIEW_RESUMO_VENDAS'), firebirdController.getResumoVendas);
/* router.get('/controle-entregas', requirePermission('MANAGE_ENTREGAS'), firebirdController.getResumoVendas); */
router.get('/vendas/:orcamentoCodigo/itens', requirePermission('VIEW_RESUMO_VENDAS'), firebirdController.getVendaItens);
router.get('/pedido-compras', requirePermission('VIEW_PEDIDO_COMPRAS'), firebirdController.getPedidoCompras);
router.get('/pedido-detalhes', requirePermission('VIEW_PEDIDO_COMPRAS'), firebirdController.getPedidoDetalhes);
router.get('/clientes/search', requirePermission('VIEW_MAPA_CLIENTES'), firebirdController.searchClientes);
router.get('/clientes/enderecos', requirePermission('VIEW_MAPA_CLIENTES'), firebirdController.getAllClientesWithAddress);
router.get('/geocode', requirePermission('VIEW_MAPA_CLIENTES'), firebirdController.geocodeAddress);
router.get('/fechamento-fiscal', requirePermission('VIEW_FECHAMENTO_FISCAL'), firebirdController.getFechamentoFiscalPorCFOP);

module.exports = router;
