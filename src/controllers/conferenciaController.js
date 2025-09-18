const db = require('../../database'); // Importa a conexão com o banco de dados SQLite
const sqliteService = require('../services/sqliteService');

/**
 * Alterna o status de conferência de uma venda (DAV).
 * Se a venda não existir na tabela, ela é inserida como "conferida".
 * Se já existir, o status "conferido" é invertido (0 -> 1, 1 -> 0).
 */
const toggleConferenciaStatus = (req, res, next) => {
    const { dav_codigo } = req.body;

    if (!dav_codigo) {
        return res.status(400).json({ message: 'O código DAV (dav_codigo) é obrigatório.' });
    }

    const davCodigoInt = parseInt(dav_codigo, 10);
    if (isNaN(davCodigoInt)) {
        return res.status(400).json({ message: 'O código DAV (dav_codigo) deve ser um número.' });
    }

    db.get('SELECT conferido FROM vendas_conferencia WHERE dav_codigo = ?', [davCodigoInt], (err, row) => {
        if (err) {
            console.error('Erro ao consultar status de conferência:', err.message);
            return next(err);
        }

        if (row) {
            // Se existe, inverte o status e atualiza a data
            const novoStatus = row.conferido ? 0 : 1;
            const novaData = novoStatus ? new Date().toISOString() : null;

            db.run(
                'UPDATE vendas_conferencia SET conferido = ?, data_conferencia = ? WHERE dav_codigo = ?',
                [novoStatus, novaData, davCodigoInt],
                function (err) {
                    if (err) {
                        console.error('Erro ao atualizar status de conferência:', err.message);
                        return next(err);
                    }
                    res.json({ message: 'Status de conferência atualizado com sucesso.', conferido: novoStatus });
                }
            );
        } else {
            // Se não existe, insere como conferido
            const novaData = new Date().toISOString();
            db.run(
                'INSERT INTO vendas_conferencia (dav_codigo, conferido, data_conferencia) VALUES (?, 1, ?)',
                [davCodigoInt, novaData],
                function (err) {
                    if (err) {
                        console.error('Erro ao inserir novo status de conferência:', err.message);
                        return next(err);
                    }
                    res.status(201).json({ message: 'Status de conferência criado com sucesso.', conferido: 1 });
                }
            );
        }
    });
};

/**
 * Busca os status de conferência para uma lista de DAVs.
 */
const getConferenciaStatuses = async (req, res, next) => {
    const { davCodigos } = req.body;

    if (!Array.isArray(davCodigos)) {
        return res.status(400).json({ message: 'O corpo da requisição deve conter um array de davCodigos.' });
    }

    if (davCodigos.length === 0) {
        return res.json({}); // Retorna um objeto vazio se não houver códigos para buscar
    }

    try {
        const statusMap = await sqliteService.getConferenciaStatus(davCodigos);
        // Converte o Map para um objeto simples para ser enviado como JSON
        const statusObj = Object.fromEntries(statusMap);
        res.json(statusObj);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    toggleConferenciaStatus,
    getConferenciaStatuses,
};