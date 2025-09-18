const sqliteService = require('../services/sqliteService'); // Use the async service
const firebirdService = require('../services/firebirdService');

// --- Entregadores ---

const getEntregadores = async (req, res, next) => {
    try {
        const rows = await sqliteService.all('SELECT * FROM entregadores ORDER BY nome');
        res.json(rows);
    } catch (err) {
        console.error('Erro ao buscar entregadores:', err.message);
        return next(new Error('Não foi possível buscar os entregadores.'));
    }
};

const createEntregador = async (req, res, next) => {
    const { nome } = req.body;
    if (!nome) {
        return res.status(400).json({ message: 'O nome do entregador é obrigatório.' });
    }

    const sql = 'INSERT INTO entregadores (nome) VALUES (?)';
    try {
        const result = await sqliteService.run(sql, [nome]);
        res.status(201).json({ id: result.lastID, nome });
    } catch (err) {
        console.error('Erro ao criar entregador:', err.message);
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ message: 'Já existe um entregador com este nome.' });
        }
        return next(new Error('Não foi possível criar o entregador.'));
    }
};

const getVendasParaEntrega = async (req, res, next) => {
    try {
        let sqlWhere = 'WHERE 1=1';
        const params = [];
        if (req.query.codigoCliente) {
            sqlWhere += ' AND O.CODIGO_CLIENTE = ?';
            params.push(parseInt(req.query.codigoCliente));
        }
        if (req.query.dav) {
            sqlWhere += ' AND O.CODIGO = ?';
            params.push(parseInt(req.query.dav));
        }

        const firebirdSql = `
            SELECT
                O.CODIGO,
                O.CODIGO_CLIENTE,
                CAST(C.NOME AS VARCHAR(100)) AS NOME_CLIENTE,
                O.DATA_ORCAMENTO,
                O.ORCAMENTO_LIQUIDO,
                O.STATUS,
                O.CODIGO_FILIAL
            FROM ORCAMENTO O
            LEFT JOIN CLIENTE C ON C.CODIGO = O.CODIGO_CLIENTE
            ${sqlWhere}
            ORDER BY O.DATA_ORCAMENTO DESC, O.CODIGO DESC
        `;
        const vendas = await firebirdService.query(firebirdSql, params);

        const entregasSql = 'SELECT * FROM entregas';
        const entregas = await sqliteService.all(entregasSql);

        const entregasMap = entregas.reduce((acc, entrega) => {
            acc[entrega.vendaId] = entrega;
            return acc;
        }, {});

        const mergedVendas = vendas.map(venda => ({
            ...venda,
            DATA_ORCAMENTO: venda.DATA_ORCAMENTO ? venda.DATA_ORCAMENTO.toISOString().split('T')[0] : null,
            entrega: entregasMap[venda.CODIGO] || null
        }));

        res.json({ data: mergedVendas });

    } catch (err) {
        console.error('Erro ao buscar vendas para entrega:', err);
        next(new Error('Não foi possível carregar os dados de vendas.'));
    }
};

const saveEntrega = async (req, res, next) => {
    const { vendaId, codigoCliente, entregadorId, caixasSaida, caixasRetorno, conferidoPor } = req.body;

    if (!vendaId || !codigoCliente) {
        return res.status(400).json({ message: 'vendaId e codigoCliente são obrigatórios.' });
    }

    try {
        await sqliteService.run('BEGIN TRANSACTION;');

        const oldEntrega = await sqliteService.get('SELECT caixasSaida, caixasRetorno FROM entregas WHERE vendaId = ?', [vendaId]);
        const oldDelta = oldEntrega ? (oldEntrega.caixasSaida || 0) - (oldEntrega.caixasRetorno || 0) : 0;
        const newDelta = (caixasSaida || 0) - (caixasRetorno || 0);
        const changeInDelta = newDelta - oldDelta;

        const entregaSql = `
            REPLACE INTO entregas (vendaId, entregadorId, caixasSaida, caixasRetorno, conferidoPor, dataConferencia)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;
        const entregaParams = [vendaId, entregadorId, caixasSaida, caixasRetorno, conferidoPor];
        await sqliteService.run(entregaSql, entregaParams);

        const createCaixasSql = 'INSERT OR IGNORE INTO caixas_cliente (codigoCliente, quantidade) VALUES (?, 0)';
        await sqliteService.run(createCaixasSql, [codigoCliente]);

        if (changeInDelta !== 0) {
            const updateCaixasSql = `
                UPDATE caixas_cliente
                SET quantidade = quantidade - ?
                WHERE codigoCliente = ?
            `;
            await sqliteService.run(updateCaixasSql, [changeInDelta, codigoCliente]);
        }

        await sqliteService.run('COMMIT;');
        res.status(200).json({ message: 'Entrega salva com sucesso!' });

    } catch (err) {
        await sqliteService.run('ROLLBACK;');
        console.error('Erro ao salvar entrega (transação revertida):', err);
        next(new Error('Ocorreu um erro ao salvar os dados da entrega.'));
    }
};

const searchVendas = async (req, res, next) => {
    try {
        const { termo } = req.query;
        if (!termo) {
            return res.json([]);
        }

        const sql = `
            SELECT FIRST 10
                O.CODIGO,
                C.NOME AS NOME_CLIENTE,
                O.DATA_ORCAMENTO
            FROM ORCAMENTO O
            LEFT JOIN CLIENTE C ON O.CODIGO_CLIENTE = C.CODIGO
            WHERE CAST(O.CODIGO AS VARCHAR(20)) LIKE ?
            ORDER BY O.CODIGO DESC
        `;
        const params = [`%${termo}%`];
        const result = await firebirdService.query(sql, params);
        
        const formattedResult = result.map(venda => {
            let dataFormatada = null;
            if (venda.DATA_ORCAMENTO) {
                const d = new Date(venda.DATA_ORCAMENTO);
                // Usar métodos UTC para extrair a data, ignorando o fuso horário do servidor.
                // Isso garante que a data '2025-09-08' no banco não se torne '2025-09-07' por causa de conversões de fuso.
                const ano = d.getUTCFullYear();
                const mes = String(d.getUTCMonth() + 1).padStart(2, '0'); // getUTCMonth() é 0-indexado
                const dia = String(d.getUTCDate()).padStart(2, '0');
                dataFormatada = `${ano}-${mes}-${dia}`;
            }
            return {
                ...venda,
                DATA_ORCAMENTO: dataFormatada
            };
        });

        res.json(formattedResult);
    } catch (err) {
        console.error('Erro ao buscar vendas (DAV):', err);
        next(new Error('Não foi possível realizar a busca de vendas.'));
    }
};

module.exports = {
    getEntregadores,
    createEntregador,
    getVendasParaEntrega,
    saveEntrega,
    searchVendas,
};