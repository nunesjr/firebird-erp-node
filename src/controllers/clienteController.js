const firebirdService = require('../services/firebirdService');

/**
 * @description Busca a lista de produtos disponíveis para venda.
 * - Filtra pela filial 1.
 * - Retorna apenas informações públicas (código, descrição, preço de venda).
 */
const getProdutosDisponiveis = async (req, res, next) => {
    try {
        // A query une PRODUTOS e PRODUTO_PARAMETROS para pegar a descrição e o preço.
        // Garante que apenas produtos da filial 1 e da seção 6 sejam retornados.
        const sql = `
            SELECT 
                p.CODIGO, 
                p.DESCRICAO, 
                p.TIPO_PRODUTO,
                pp.PRECO_VENDA
            FROM PRODUTO_PARAMETROS pp
            JOIN PRODUTO p ON pp.CODIGO_PRODUTO = p.CODIGO
            WHERE pp.CODIGO_FILIAL = 1 AND p.COD_SECAO = 6
            ORDER BY p.DESCRICAO;
        `;

        const produtos = await firebirdService.query(sql);

        // Mapeia para garantir que os nomes das chaves estejam em minúsculas e consistentes
        const produtosFormatados = produtos.map(p => ({
            codigo: p.CODIGO,
            descricao: p.DESCRICAO,
            precoVenda: p.PRECO_VENDA,
            tipoProduto: p.TIPO_PRODUTO
        }));

        res.json(produtosFormatados);

    } catch (err) {
        console.error('Erro ao buscar produtos disponíveis:', err.message);
        next(err);
    }
};

/**
 * @description Busca o histórico de compras (orçamentos) para o cliente logado.
 */
const getMinhasCompras = async (req, res, next) => {
    try {
        const codigoCliente = req.user.codigoCliente;

        if (!codigoCliente) {
            return res.status(403).json({ message: 'Usuário não está associado a um cliente.' });
        }

        const sql = `
            SELECT
                O.CODIGO,
                O.DATA_ORCAMENTO,
                O.ORCAMENTO_LIQUIDO,
                O.STATUS
            FROM ORCAMENTO O
            WHERE O.CODIGO_CLIENTE = ?
            ORDER BY O.DATA_ORCAMENTO DESC, O.CODIGO DESC
        `;

        const vendas = await firebirdService.query(sql, [codigoCliente]);

        const formattedVendas = vendas.map(venda => ({
            ...venda,
            DATA_ORCAMENTO: venda.DATA_ORCAMENTO ? venda.DATA_ORCAMENTO.toISOString().split('T')[0] : null
        }));

        res.json({ data: formattedVendas });

    } catch (err) {
        console.error('Erro ao buscar minhas compras:', err);
        next(new Error('Não foi possível carregar o histórico de compras.'));
    }
};

/**
 * @description Busca os itens de uma compra específica (orçamento) do cliente logado.
 */
const getMinhaCompraItens = async (req, res, next) => {
    try {
        const { orcamentoCodigo } = req.params;
        const codigoCliente = req.user.codigoCliente;

        if (!orcamentoCodigo || isNaN(parseInt(orcamentoCodigo))) {
            return res.status(400).json({ message: 'Código de orçamento inválido.' });
        }

        // Validação para garantir que o cliente só possa ver seus próprios itens
        const orcamentoSql = 'SELECT CODIGO_CLIENTE FROM ORCAMENTO WHERE CODIGO = ?';
        const orcamentoResult = await firebirdService.query(orcamentoSql, [parseInt(orcamentoCodigo)]);

        if (orcamentoResult.length === 0 || orcamentoResult[0].CODIGO_CLIENTE !== codigoCliente) {
            return res.status(403).json({ message: 'Acesso negado a este orçamento.' });
        }

        const sqlItems = `
            SELECT
                OI.SEQUENCIA,
                OI.CODIGO_PRODUTO,
                CAST(OI.PAF_DESCRICAO_PRODUTO AS VARCHAR(255)) AS PAF_DESCRICAO_PRODUTO,
                OI.QUANTIDADE,
                OI.PRECO_UNITARIO,
                COALESCE(OI.DESCONTO_VALOR, 0) AS DESCONTO_VALOR,
                OI.VALOR_TOTAL
            FROM ORCAMENTO_ITEM OI
            WHERE OI.CODIGO_ORCAMENTO = ?
            ORDER BY OI.SEQUENCIA ASC
        `;
        const items = await firebirdService.query(sqlItems, [parseInt(orcamentoCodigo)]);

        res.json({ items });

    } catch (err) {
        console.error('Erro ao buscar itens da minha compra:', err);
        next(new Error('Não foi possível carregar os itens da compra.'));
    }
};

/**
 * @description Busca os dados para o dashboard do cliente, como top 10 produtos.
 */
const getDashboardData = async (req, res, next) => {
    try {
        const codigoCliente = req.user.codigoCliente;
        if (!codigoCliente) {
            return res.status(403).json({ message: 'Usuário não está associado a um cliente.' });
        }

        const sqlTopProdutos = `
            SELECT FIRST 10
                OI.CODIGO_PRODUTO,
                MAX(OI.PAF_DESCRICAO_PRODUTO) as NOME_PRODUTO,
                SUM(OI.QUANTIDADE) as QUANTIDADE_TOTAL
            FROM ORCAMENTO_ITEM OI
            JOIN ORCAMENTO O ON OI.CODIGO_ORCAMENTO = O.CODIGO
            WHERE O.CODIGO_CLIENTE = ?
            GROUP BY OI.CODIGO_PRODUTO
            ORDER BY QUANTIDADE_TOTAL DESC
        `;

        const topProdutos = await firebirdService.query(sqlTopProdutos, [codigoCliente]);

        res.json({ topProdutos });

    } catch (err) {
        console.error('Erro ao buscar dados do dashboard do cliente:', err);
        next(new Error('Não foi possível carregar os dados do dashboard.'));
    }
};

const getMeusTitulos = async (req, res, next) => {
    try {
        const codigoCliente = req.user.codigoCliente;

        if (!codigoCliente) {
            return res.status(403).json({ message: 'Usuário não está associado a um cliente.' });
        }

        const titulos = await firebirdService.getTitulosAbertosPorCliente(codigoCliente);

        // Format dates to YYYY-MM-DD
        const formattedTitulos = titulos.map(titulo => ({
            ...titulo,
            DATA_EMISSAO: titulo.DATA_EMISSAO ? titulo.DATA_EMISSAO.toISOString().split('T')[0] : null,
            DATA_VENCIMENTO: titulo.DATA_VENCIMENTO ? titulo.DATA_VENCIMENTO.toISOString().split('T')[0] : null,
        }));

        res.json({ data: formattedTitulos });

    } catch (err) {
        console.error('Erro ao buscar meus títulos:', err);
        next(new Error('Não foi possível carregar os títulos em aberto.'));
    }
};

module.exports = {
    getProdutosDisponiveis,
    getMinhasCompras,
    getMinhaCompraItens,
    getDashboardData,
    getMeusTitulos,
};