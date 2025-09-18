const firebirdService = require('../services/firebirdService');

const secoesMap = {
  1: 'Ativo', 2: 'Brinquedos', 3: 'Combustível', 4: 'Uso e Consumo',
  5: 'Diversos', 6: 'Hortifruti', 7: 'Laticínios', 8: 'Mercearia'
};

const gruposMap = {
  1: 'Ativo', 2: 'Bebidas', 3: 'Bebidas', 4: 'Bebidas', 5: 'Bombonier',
  6: 'Bombonier', 7: 'Brinquedos', 8: 'Brinquedos', 9: 'Combustivel',
  10: 'Condimentos', 11: 'Consumo', 12: 'Folhas', 13: 'Folhas',
  14: 'Frutas', 15: 'Mercearia', 16: 'Mercearia', 17: 'Mercearia',
  18: 'Mercearia', 19: 'Padaria', 20: 'Picadinhos', 21: 'Picadinhos',
  22: 'Sucos', 23: 'Verdura', 24: 'Verdura', 25: 'Sorvetes'
};

const getPrecosVenda = async (req, res, next) => {
    try {
        const { codigo, descricao, secao, grupo, filial } = req.query;

        // Base da query
        let sql = `
            SELECT
                P.CODIGO,
                P.DESCRICAO,
                P.COD_SECAO,
                P.COD_GRUPO,
                PP.F_CUSTO_REPOSICAO,
                PP.PRECO_VENDA,
                PP.CODIGO_FILIAL
            FROM
                PRODUTO P
            JOIN
                PRODUTO_PARAMETROS PP ON P.CODIGO = PP.CODIGO_PRODUTO
            WHERE
                P.STATUS = 'A'
        `;
        
        const params = [];

        // Adiciona filtros dinamicamente
        if (filial) {
            sql += ' AND PP.CODIGO_FILIAL = ?';
            params.push(filial);
        }
        if (codigo) {
            sql += ' AND P.CODIGO = ?';
            params.push(codigo);
        }
        if (descricao) {
            sql += ` AND P.DESCRICAO LIKE ?`;
            params.push(`%${descricao.toUpperCase()}%`);
        }
        if (secao) {
            sql += ' AND P.COD_SECAO = ?';
            params.push(secao);
        }
        if (grupo) {
            sql += ' AND P.COD_GRUPO = ?';
            params.push(grupo);
        }

        sql += ' ORDER BY P.DESCRICAO';

        const result = await firebirdService.query(sql, params);

        // Mapeia os códigos de seção e grupo para suas descrições
        const formattedResult = result.map(item => ({
            ...item,
            SECAO_DESCRICAO: secoesMap[item.COD_SECAO] || 'Desconhecida',
            GRUPO_DESCRICAO: gruposMap[item.COD_GRUPO] || 'Desconhecido'
        }));

        res.json(formattedResult);

    } catch (err) {
        console.error('Erro ao buscar preços de venda:', err);
        next(new Error('Não foi possível realizar a busca de preços.'));
    }
};

module.exports = {
    getPrecosVenda,
};
