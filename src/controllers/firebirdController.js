const firebirdService = require('../services/firebirdService');

const getProdutosCustoReposicao = async (req, res, next) => {
    let empresas = req.query.empresa;
    if (!empresas) {
        const err = new Error('Parâmetro "empresa" é obrigatório.');
        err.status = 400;
        return next(err);
    }

    if (!Array.isArray(empresas)) {
        empresas = [empresas];
    }

    empresas = empresas.map(e => Number(e)).filter(e => [1, 2].includes(e));

    if (empresas.length === 0) {
        const err = new Error('Parâmetro "empresa" inválido. Valores permitidos: 1 (Matriz), 2 (Filial).');
        err.status = 400;
        return next(err);
    }

    const placeholders = empresas.map(() => '?').join(',');

    try {
        const sql = `
            SELECT
                P.CODIGO AS CODIGO,
                P.DESCRICAO,
                PP.F_CUSTO_REPOSICAO,
                PP.CODIGO_FILIAL
            FROM PRODUTO_PARAMETROS PP
            JOIN PRODUTO P ON P.CODIGO = PP.CODIGO_PRODUTO
            WHERE PP.CODIGO_FILIAL IN (${placeholders}) AND PP.F_CUSTO_REPOSICAO IS NOT NULL
            ORDER BY P.CODIGO
        `;
        const result = await firebirdService.query(sql, empresas);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

const getEstoque = async (req, res, next) => {
    try {
        const { tipo_estoque, apenas_negativos, ordenacao } = req.query;

        let sql = `
            SELECT
                P.CODIGO AS CODIGO_PRODUTO,
                P.DESCRICAO,
                (SELECT SUM(EP.ESTOQUE) FROM ESTOQUE_PRODUTO EP WHERE EP.CODIGO_PRODUTO = P.CODIGO) AS ESTOQUE,
                PP.CODIGO_FILIAL AS TIPO_ESTOQUE,
                P.COD_FORNECEDOR AS CODIGO_FORNECEDOR,
                (SELECT F.RAZAO_SOCIAL FROM FORNECEDOR F WHERE F.CODIGO = P.COD_FORNECEDOR) AS FORNECEDOR,
                P.COD_SECAO,
                P.COD_GRUPO
            FROM
                PRODUTO P
            JOIN
                PRODUTO_PARAMETROS PP ON P.CODIGO = PP.CODIGO_PRODUTO
            WHERE 1=1
        `;

        const params = [];

        if (tipo_estoque === '1') { // Matriz
            sql += ` AND PP.CODIGO_FILIAL = 1`;
        } else if (tipo_estoque === '2') { // Filial
            sql += ` AND PP.CODIGO_FILIAL = 2`;
        }

        if (apenas_negativos === 'true') {
            sql += ` AND (SELECT sum(ep.estoque) FROM ESTOQUE_PRODUTO ep WHERE ep.CODIGO_PRODUTO = P.CODIGO) < 0`;
        }

        const allowedOrder = ['codigo_asc', 'codigo_desc', 'descricao_asc', 'descricao_desc', 'estoque_asc', 'estoque_desc'];
        const orderBy = allowedOrder.includes(ordenacao) ? ordenacao : 'descricao_asc';
        const [field, direction] = orderBy.split('_');
        
        let dbField;
        switch (field) {
            case 'codigo':
                dbField = 'P.CODIGO';
                break;
            case 'estoque':
                dbField = 'ESTOQUE';
                break;
            case 'descricao':
            default:
                dbField = 'P.DESCRICAO';
                break;
        }

        sql += ` ORDER BY ${dbField} ${direction.toUpperCase()}`;

        const result = await firebirdService.query(sql, params);
        
        const formattedResult = result.map(item => ({
            ...item,
            CODIGO_PRODUTO: item.CODIGO_PRODUTO,
            DESCRICAO: item.DESCRICAO,
            ESTOQUE: item.ESTOQUE ? parseFloat(item.ESTOQUE) : 0,
            TIPO_ESTOQUE: item.TIPO_ESTOQUE === 1 ? 'Matriz' : 'Filial',
            CODIGO_FORNECEDOR: item.CODIGO_FORNECEDOR,
            FORNECEDOR: item.FORNECEDOR,
            COD_SECAO: item.COD_SECAO,
            COD_GRUPO: item.COD_GRUPO,
        }));

        res.json(formattedResult);
    } catch (err) {
        next(err);
    }
};

const getFechamentoFiscalPorCFOP = async (req, res, next) => {
    try {
        const { dataInicio, dataFim } = req.query;

        // Validação básica das datas
        if (!dataInicio || !dataFim) {
            // Retorna arrays vazios se não houver datas, para não quebrar o frontend
            return res.json({ saidas: [], entradas: [] });
        }

        const params = [dataInicio, dataFim];

        const sqlAll = `
            SELECT CFOP, DATA, TOTAL, VALOR_ICMS, VALOR_PIS, VALOR_COFINS FROM (
                -- Entradas de Produtos
                SELECT
                    CAST(ei.codigo_cfop AS VARCHAR(4)) AS CFOP,
                    CAST(e.data_entrada AS TIMESTAMP) AS DATA,
                    CAST((ei.quantidade * ei.valor_unitario) AS NUMERIC(15, 2)) AS TOTAL,
                    CAST(COALESCE(ei.F_NOTA_VALOR_ICMS, 0) AS NUMERIC(15, 2)) AS VALOR_ICMS,
                    CAST(COALESCE(ei.F_VALOR_TOTAL_PIS, 0) AS NUMERIC(15, 2)) AS VALOR_PIS,
                    CAST(COALESCE(ei.F_VALOR_TOTAL_COFINS, 0) AS NUMERIC(15, 2)) AS VALOR_COFINS
                FROM entrada_item ei
                JOIN entrada e ON ei.codigo_entrada = e.codigo
                WHERE ei.codigo_cfop IS NOT NULL

                UNION ALL

                -- Entradas de Serviços (Despesas)
                SELECT
                    CAST(sdi.codigo_cfop AS VARCHAR(4)) AS CFOP,
                    CAST(sd.DATA_ENT_SAI AS TIMESTAMP) AS DATA,
                    CAST(sdi.valor_total AS NUMERIC(15, 2)) AS TOTAL,
                    CAST(COALESCE(sdi.VALOR_ICMS, 0) AS NUMERIC(15, 2)) AS VALOR_ICMS,
                    CAST(COALESCE(sdi.VALOR_PIS, 0) AS NUMERIC(15, 2)) AS VALOR_PIS,
                    CAST(COALESCE(sdi.VALOR_COFINS, 0) AS NUMERIC(15, 2)) AS VALOR_COFINS
                FROM sped_despesa_item sdi
                JOIN sped_despesa sd ON sdi.codigo_sped_despesa = sd.codigo
                WHERE sdi.codigo_cfop IS NOT NULL

                UNION ALL

                -- Saídas (NF-e e NFC-e)
                SELECT
                    CAST(coalesce(nfi.codigo_cfop, nf.codigo_cfop) AS VARCHAR(4)) AS CFOP,
                    CAST(nf.data_emissao AS TIMESTAMP) AS DATA,
                    CAST(coalesce(nfi.nfe_valor_total, nfi.valor_total) AS NUMERIC(15, 2)) AS TOTAL,
                    CAST(COALESCE(nfi.NFE_VALOR_ICMS, 0) AS NUMERIC(15, 2)) AS VALOR_ICMS,
                    CAST(COALESCE(nfi.NFE_VALOR_PIS, 0) AS NUMERIC(15, 2)) AS VALOR_PIS,
                    CAST(COALESCE(nfi.NFE_VALOR_COFINS, 0) AS NUMERIC(15, 2)) AS VALOR_COFINS
                FROM nota_fiscal_item nfi
                JOIN nota_fiscal nf ON nfi.codigo_nf = nf.codigo
                WHERE coalesce(nfi.codigo_cfop, nf.codigo_cfop) IS NOT NULL

                UNION ALL

                -- Saídas (CF-e/SAT)
                SELECT
                    CAST(dfi.cfop_i08 AS VARCHAR(4)) AS CFOP,
                    CAST(df.dhemi_b09 AS TIMESTAMP) AS DATA,
                    CAST(dfi.vprod_i11 AS NUMERIC(15, 2)) AS TOTAL,
                    CAST(COALESCE(dfi.VICMS_N17, 0) AS NUMERIC(15, 2)) AS VALOR_ICMS,
                    CAST(COALESCE(dfi.VPIS_Q09, 0) AS NUMERIC(15, 2)) AS VALOR_PIS,
                    CAST(COALESCE(dfi.VCOFINS_S11, 0) AS NUMERIC(15, 2)) AS VALOR_COFINS
                FROM doc_fiscal_item dfi
                JOIN doc_fiscal df ON dfi.codigo_doc_fiscal = df.codigo
                WHERE dfi.cfop_i08 IS NOT NULL AND df.status NOT IN ('CSL', 'CAS', 'NTR')
            )
            WHERE DATA BETWEEN ? AND ?
        `;

        const allOperations = await firebirdService.query(sqlAll, params);

        const entradas = [];
        const saidas = [];

        allOperations.forEach(item => {
            if (item.CFOP) {
                const firstDigit = item.CFOP.substring(0, 1);
                if (['1', '2', '3'].includes(firstDigit)) {
                    entradas.push(item);
                } else if (['5', '6', '7'].includes(firstDigit)) {
                    saidas.push(item);
                }
            }
        });

        res.json({ saidas, entradas });
    } catch (err) {
        console.error(err);
        next(err);
    }
};


const getTabelaPrecos = async (req, res, next) => {
    try {
        const { codigoCliente } = req.params;
        const codigoFilial = parseInt(req.query.filial);

        if (!codigoCliente || isNaN(parseInt(codigoCliente))) {
            const err = new Error('Código do cliente inválido');
            err.status = 400;
            return next(err);
        }

        if (!codigoFilial || ![1, 2].includes(codigoFilial)) {
            const err = new Error('Filial inválida. A filial deve ser 1 (Matriz) ou 2 (Filial)');
            err.status = 400;
            return next(err);
        }

        if (req.user.role === 'cliente' && req.user.codigoCliente != codigoCliente) {
            const err = new Error('Acesso negado: Você só pode acessar dados do seu próprio cliente.');
            err.status = 403;
            return next(err);
        }

        const sql = `
            SELECT
                ccp.CODIGO_PRODUTO,
                p.DESCRICAO,
                ccp.PRECO_FIXO,
                pp.F_CUSTO_REPOSICAO,
                ccp.CODIGO_CLIENTE_CONVENIO,
                (SELECT MAX(OI.DATA_INCLUSAO) FROM ORCAMENTO_ITEM OI JOIN ORCAMENTO O ON O.CODIGO = OI.CODIGO_ORCAMENTO WHERE O.CODIGO_CLIENTE = ccp.CODIGO_CLIENTE_CONVENIO AND OI.CODIGO_PRODUTO = ccp.CODIGO_PRODUTO) AS DATA_ULTIMA_COMPRA
            FROM CLIENTE_CONVENIO_PRODUTO ccp
            LEFT JOIN PRODUTO p ON p.CODIGO = ccp.CODIGO_PRODUTO
            LEFT JOIN PRODUTO_PARAMETROS pp ON pp.CODIGO_PRODUTO = ccp.CODIGO_PRODUTO
            WHERE ccp.CODIGO_CLIENTE_CONVENIO = ? AND pp.CODIGO_FILIAL = ?
            ORDER BY ccp.CODIGO_PRODUTO
        `;

        const result = await firebirdService.query(sql, [parseInt(codigoCliente), codigoFilial]);
        
        const formattedResult = result.map(item => ({
            ...item,
            DATA_ULTIMA_COMPRA: item.DATA_ULTIMA_COMPRA ? new Date(item.DATA_ULTIMA_COMPRA).toISOString().split('T')[0] : null
        }));

        res.json({
            message: `Tabela de preços do cliente ${codigoCliente} na filial ${codigoFilial}`,
            data: formattedResult,
            total: formattedResult.length
        });

    } catch (err) {
        next(err);
    }
};

const getResumoVendas = async (req, res, next) => {
    try {
        let sqlWhere = 'WHERE 1=1';
        const params = [];

        // Add filter for codigoCliente from query
        if (req.query.codigoCliente) {
            sqlWhere += ' AND O.CODIGO_CLIENTE = ?';
            params.push(parseInt(req.query.codigoCliente));
        }

        if (req.user.role === 'cliente' && req.user.codigoCliente) {
            sqlWhere += ' AND O.CODIGO_CLIENTE = ?';
            params.push(parseInt(req.user.codigoCliente));
        }

        const sql = `
            SELECT
                O.CODIGO,
                O.CODIGO_CLIENTE,
                CAST(C.NOME AS VARCHAR(100)) AS NOME_CLIENTE,
                CAST(C.APELIDO AS VARCHAR(100)) AS APELIDO_CLIENTE,
                O.DATA_ORCAMENTO,
                O.USUARIO,
                O.CODIGO_FUNCIONARIO AS CODIGO_VENDEDOR,
                O.CODIGO_FILIAL,
                O.ORCAMENTO_BRUTO,
                O.ORCAMENTO_LIQUIDO,
                O.STATUS,
                (SELECT FIRST 1 OI.SITUACAO_ENTREGA FROM ORCAMENTO_ITEM OI JOIN ORCAMENTO O ON O.CODIGO = OI.CODIGO_ORCAMENTO WHERE O.CODIGO_CLIENTE = O.CODIGO_CLIENTE AND OI.CODIGO_PRODUTO = OI.CODIGO_PRODUTO) AS SITUACAO_ENTREGA
            FROM ORCAMENTO O
            LEFT JOIN CLIENTE C ON C.CODIGO = O.CODIGO_CLIENTE
            ${sqlWhere}
            ORDER BY O.DATA_ORCAMENTO DESC, O.CODIGO DESC
        `;

        const vendas = await firebirdService.query(sql, params);

        const formattedVendas = vendas.map(venda => ({
            ...venda,
            DATA_ORCAMENTO: venda.DATA_ORCAMENTO ? venda.DATA_ORCAMENTO.toISOString().split('T')[0] : null
        }));

        res.json({ data: formattedVendas });

    } catch (err) {
        next(err);
    }
};

const getVendaItens = async (req, res, next) => {
    try {
        const { orcamentoCodigo } = req.params;

        if (!orcamentoCodigo || isNaN(parseInt(orcamentoCodigo))) {
            const err = new Error('Código de orçamento inválido.');
            err.status = 400;
            return next(err);
        }

        const sqlItems = `
            SELECT
                OI.SEQUENCIA,
                OI.CODIGO_PRODUTO,
                CAST(OI.PAF_DESCRICAO_PRODUTO AS VARCHAR(255)) AS PAF_DESCRICAO_PRODUTO,
                OI.QUANTIDADE,
                OI.PRECO_UNITARIO,
                COALESCE(OI.DESCONTO_VALOR, 0) AS DESCONTO_VALOR,
                OI.VALOR_TOTAL,
                OI.CUSTO_REPOSICAO
            FROM ORCAMENTO_ITEM OI
            WHERE OI.CODIGO_ORCAMENTO = ?
            ORDER BY OI.SEQUENCIA ASC
        `;
        const items = await firebirdService.query(sqlItems, [parseInt(orcamentoCodigo)]);

        const sqlObservacao = `
            SELECT CAST(O.OBSERVACAO AS VARCHAR(255)) AS OBSERVACAO
            FROM ORCAMENTO O
            WHERE O.CODIGO = ?
        `;
        const observacaoResult = await firebirdService.query(sqlObservacao, [parseInt(orcamentoCodigo)]);
        const observacao = observacaoResult.length > 0 ? observacaoResult[0].OBSERVACAO : null;

        res.json({ items, observacao });

    } catch (err) {
        next(err);
    }
};

const getPedidoCompras = async (req, res, next) => {
    try {
        const { dataInicio, dataFim, codigoCliente, situacaoEntrega } = req.query;

        if (!dataInicio || !dataFim) {
            const err = new Error('As datas de início e fim são obrigatórias.');
            err.status = 400;
            return next(err);
        }

        let sqlWhere = `WHERE OI.DATA_PREVISAO_ENTREGA BETWEEN ? AND ?`;
        const params = [dataInicio, dataFim];

        if (situacaoEntrega) {
            sqlWhere += ' AND OI.SITUACAO_ENTREGA = ?';
            params.push(situacaoEntrega);
        }

        if (req.user.role === 'cliente' && req.user.codigoCliente) {
            sqlWhere += ' AND O.CODIGO_CLIENTE = ?';
            params.push(parseInt(req.user.codigoCliente));
        } else if (codigoCliente) {
            sqlWhere += ' AND O.CODIGO_CLIENTE = ?';
            params.push(parseInt(codigoCliente));
        }

        const sql = `
            SELECT
                OI.CODIGO_PRODUTO,
                CAST(OI.PAF_DESCRICAO_PRODUTO AS VARCHAR(255)) AS PAF_DESCRICAO_PRODUTO,
                OI.QUANTIDADE, 
                OI.DATA_PREVISAO_ENTREGA,
                P.FRACAO_COMPRA3,
                PP.F_CUSTO_REPOSICAO
            FROM ORCAMENTO_ITEM OI
            LEFT JOIN ORCAMENTO O ON OI.CODIGO_ORCAMENTO = O.CODIGO
            LEFT JOIN PRODUTO P ON OI.CODIGO_PRODUTO = P.CODIGO
            LEFT JOIN PRODUTO_PARAMETROS PP ON P.CODIGO = PP.CODIGO_PRODUTO AND PP.CODIGO_FILIAL = O.CODIGO_FILIAL
            ${sqlWhere}
            ORDER BY OI.CODIGO_PRODUTO, OI.DATA_PREVISAO_ENTREGA ASC
        `;

        const entregas = await firebirdService.query(sql, params);

        const entregasFormatadas = {};
        const datasUnicas = new Set();

        entregas.forEach(entrega => {
            const produtoId = entrega.CODIGO_PRODUTO;
            const dataEntrega = entrega.DATA_PREVISAO_ENTREGA ? entrega.DATA_PREVISAO_ENTREGA.toISOString().split('T')[0] : 'Data Desconhecida';
            
            datasUnicas.add(dataEntrega);

            if (!entregasFormatadas[produtoId]) {
                entregasFormatadas[produtoId] = {
                    CODIGO_PRODUTO: produtoId,
                    PAF_DESCRICAO_PRODUTO: entrega.PAF_DESCRICAO_PRODUTO,
                    FRACAO_COMPRA3: entrega.FRACAO_COMPRA3,
                    F_CUSTO_REPOSICAO: entrega.F_CUSTO_REPOSICAO,
                    quantidadesPorData: {}
                };
            }
            entregasFormatadas[produtoId].quantidadesPorData[dataEntrega] = 
                (entregasFormatadas[produtoId].quantidadesPorData[dataEntrega] || 0) + entrega.QUANTIDADE;
        });

        const resultadoFinal = Object.values(entregasFormatadas);
        const datasHeader = Array.from(datasUnicas).sort();

        res.json({ data: resultadoFinal, datas: datasHeader });

    } catch (err) {
        next(err);
    }
};

const getPedidoDetalhes = async (req, res, next) => {
    try {
        const { dataInicio, dataFim, codigoProduto, codigoCliente, situacaoEntrega } = req.query;

        if (!dataInicio || !dataFim || !codigoProduto) {
            const err = new Error('As datas de início, fim e o código do produto são obrigatórios.');
            err.status = 400;
            return next(err);
        }

        let sql = `
            SELECT
                O.CODIGO AS CODIGO_ORCAMENTO,
                O.OBSERVACAO,
                C.RAZAO_SOCIAL AS NOME_CLIENTE,
                OI.QUANTIDADE,
                OI.CUSTO_REPOSICAO,
                OI.VALOR_TOTAL
            FROM ORCAMENTO_ITEM OI
            JOIN ORCAMENTO O ON OI.CODIGO_ORCAMENTO = O.CODIGO
            JOIN CLIENTE C ON O.CODIGO_CLIENTE = C.CODIGO
            WHERE OI.CODIGO_PRODUTO = ? AND OI.DATA_PREVISAO_ENTREGA BETWEEN ? AND ?
        `;
        const params = [codigoProduto, dataInicio, dataFim];

        if (req.user.role === 'cliente' && req.user.codigoCliente) {
            sql += ' AND O.CODIGO_CLIENTE = ?';
            params.push(parseInt(req.user.codigoCliente));
        } else if (codigoCliente) {
            sql += ' AND O.CODIGO_CLIENTE = ?';
            params.push(parseInt(codigoCliente));
        }

        if (situacaoEntrega) {
            sql += ' AND OI.SITUACAO_ENTREGA = ?';
            params.push(situacaoEntrega);
        }

        const detalhes = await firebirdService.query(sql, params);

        const detalhesFormatados = detalhes.map(item => ({
            ...item,
            VALOR_UNITARIO: item.QUANTIDADE > 0 ? (item.VALOR_TOTAL / item.QUANTIDADE) : 0
        }));

        res.json(detalhesFormatados);

    } catch (err) {
        next(err);
    }
};

const searchClientes = async (req, res, next) => {
    try {
        const { termo } = req.query;

        if (!termo) {
            const err = new Error('O parâmetro "termo" é obrigatório.');
            err.status = 400;
            return next(err);
        }

        const sql = `
            SELECT
                CODIGO,
                NOME,
                RAZAO_SOCIAL,
                CNPJ
            FROM
                CLIENTE
            WHERE
                (CAST(CODIGO AS VARCHAR(255)) LIKE ?) OR
                (UPPER(NOME) LIKE UPPER(?)) OR
                (UPPER(RAZAO_SOCIAL) LIKE UPPER(?)) OR
                (CNPJ LIKE ?)
        `;

        const params = [`%${termo}%`, `%${termo}%`, `%${termo}%`, `%${termo}%`];
        const result = await firebirdService.query(sql, params);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

const axios = require('axios');

const db = require('../../database'); // Importa o banco de dados SQLite

const getAllClientesWithAddress = async (req, res, next) => {
    try {
        const sql = `
            SELECT
                c.CODIGO,
                c.NOME,
                c.RAZAO_SOCIAL,
                COALESCE(c.ENT_ENDERECO, c.ENDERECO) as ENDERECO,
                COALESCE(c.ENT_NUMERO, c.NUMERO) as NUMERO,
                COALESCE(c.ENT_BAIRRO, c.BAIRRO) as BAIRRO,
                COALESCE(cid_ent.NOME, cid.NOME) as CIDADE,
                COALESCE(c.ENT_UF, c.UF) as UF,
                COALESCE(c.ENT_CEP, c.CEP) as CEP
            FROM
                CLIENTE c
            LEFT JOIN CIDADE_VILA cid ON c.COD_CIDADE = cid.CODIGO
            LEFT JOIN CIDADE_VILA cid_ent ON c.ENT_COD_CIDADE = cid_ent.CODIGO
            WHERE
                (c.ENT_ENDERECO IS NOT NULL AND c.ENT_COD_CIDADE IS NOT NULL) OR (c.ENDERECO IS NOT NULL AND c.COD_CIDADE IS NOT NULL)
        `;

        const result = await firebirdService.query(sql);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

const geocodeAddress = async (req, res, next) => {
    const { endereco } = req.query;
    if (!endereco) {
        return res.status(400).json({ error: 'Endereço não fornecido.' });
    }

    // 1. Tenta buscar do cache do SQLite
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    db.get('SELECT lat, lon FROM geocode_cache WHERE address = ? AND timestamp > ?', [endereco, thirtyDaysAgo.toISOString()], async (err, row) => {
        if (err) {
            console.error('Erro ao consultar o cache de geocodificação:', err.message);
            // Continua para a API externa mesmo se o cache falhar
        } else if (row) {
            // Cache hit! Retorna o resultado do cache.
            return res.json([{ lat: row.lat, lon: row.lon }]);
        }

        // 2. Se não estiver no cache ou estiver desatualizado, busca na API externa
        try {
            const response = await axios.get('https://api.opencagedata.com/geocode/v1/json', {
                params: {
                    q: endereco,
                    key: process.env.OPENCAGE_API_KEY || 'efd1bd952cbb4b3ea6bbdbf5339b64d6',
                    language: 'pt-br',
                    limit: 1
                },
                timeout: 10000
            });

            if (response.data.results.length > 0) {
                const { lat, lng } = response.data.results[0].geometry;
                const result = [{ lat, lon: lng }];

                // 3. Salva o novo resultado no cache do SQLite
                const upsertSql = `
                    INSERT INTO geocode_cache (address, lat, lon, timestamp)
                    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(address) DO UPDATE SET
                        lat = excluded.lat,
                        lon = excluded.lon,
                        timestamp = excluded.timestamp;
                `;
                db.run(upsertSql, [endereco, lat, lng], (upsertErr) => {
                    if (upsertErr) {
                        console.error('Erro ao salvar no cache de geocodificação:', upsertErr.message);
                    }
                });

                return res.json(result);
            }

            res.json([]);

        } catch (error) {
            console.error('Erro na geocodificação externa:', error.message);
            next(new Error('Serviço de geocodificação indisponível.'));
        }
    });
};

module.exports = {
    getProdutosCustoReposicao,
    getEstoque,
    getTabelaPrecos,
    getResumoVendas,
    getVendaItens,
    getPedidoCompras,
    getPedidoDetalhes,
    searchClientes,
    getAllClientesWithAddress,
    geocodeAddress,
    getFechamentoFiscalPorCFOP
};