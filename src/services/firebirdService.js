const Firebird = require('node-firebird');

// --- Configuração do Banco de Dados Firebird ---
const dbOptions = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    role: null,
    pageSize: 4096,
    charset: 'WIN1252'
};

// --- Criação do Pool de Conexões Firebird ---
let pool;
try {
    pool = Firebird.pool(5, dbOptions);
    console.log('🔥 Pool de conexões Firebird iniciado.');
} catch (err) {
    console.error('❌ ERRO FATAL AO INICIAR O POOL DO FIREBIRD:', err.message);
    console.error('Verifique se as variáveis de ambiente (DB_HOST, DB_PORT, DB_DATABASE, etc.) estão definidas corretamente no seu arquivo .env');
    process.exit(1);
}

// Garante que o pool seja fechado ao encerrar a aplicação
process.on('SIGINT', () => {
    console.log('🚪 Encerrando o servidor. Fechando o pool de conexões Firebird...');
    pool.destroy(() => {
        console.log('Pool de conexões Firebird fechado.');
        process.exit();
    });
});

/**
 * Executa uma query no banco de dados Firebird utilizando o pool de conexões.
 * @param {string} sql A query SQL a ser executada.
 * @param {Array} params Os parâmetros da query.
 * @returns {Promise<Array>} O resultado da query.
 */
function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        pool.get((err, db) => {
            if (err) {
                console.error('❌ Erro ao obter conexão do pool Firebird:', err.message);
                return reject(new Error('Erro de conexão com o banco de dados.'));
            }

            db.query(sql, params, (err, result) => {
                db.detach(); // Libera a conexão de volta para o pool

                if (err) {
                    console.error('❌ Erro ao executar query Firebird:', err.message, 'SQL:', sql, 'Params:', params);
                    return reject(err);
                }
                resolve(result || []); // Garante que sempre retorne um array
            });
        });
    });
}

// NOVA FUNÇÃO - SIMPLIFICADA E ROBUSTA
async function getTitulosFinanceiros() {
    // Query SQL direta, sem blocos dinâmicos complexos.
    // Faz um LEFT JOIN para buscar o nome do cliente a partir do CODIGO_CLIENTE.
    const sql = `
        SELECT
            cr.CODIGO,
            cr.CODIGO_CLIENTE,
            c.NOME as NOME_CLIENTE,
            cr.CODIGO_VENDA as DAV,
            cr.DATA_EMISSAO,
            cr.DATA_VENCIMENTO,
            cr.STATUS,
            cr.VALOR_NOMINAL,
            cr.VALOR_ABERTO,
            cr.OBSERVACAO,
            cr.CODIGO_FILIAL,
            cr.BLOQUETO_NOSSONUMERO
        FROM CONTAS_RECEBER cr
        LEFT JOIN CLIENTE c ON cr.CODIGO_CLIENTE = c.CODIGO
        WHERE cr.STATUS IN ('A', 'P')
        ORDER BY cr.DATA_VENCIMENTO DESC;
    `;

    // Não precisamos mais de parâmetros para esta abordagem
    return query(sql, []);
}

async function getTitulosAbertosPorCliente(codigoCliente) {
    const sql = `
        SELECT
            cr.CODIGO,
            cr.CODIGO_CLIENTE,
            c.NOME as NOME_CLIENTE,
            cr.CODIGO_VENDA as DAV,
            cr.DATA_EMISSAO,
            cr.DATA_VENCIMENTO,
            cr.STATUS,
            cr.VALOR_NOMINAL,
            cr.VALOR_ABERTO,
            cr.OBSERVACAO,
            cr.CODIGO_FILIAL,
            cr.BLOQUETO_NOSSONUMERO
        FROM CONTAS_RECEBER cr
        LEFT JOIN CLIENTE c ON cr.CODIGO_CLIENTE = c.CODIGO
        WHERE cr.STATUS = 'A' AND cr.CODIGO_CLIENTE = ?
        ORDER BY cr.DATA_VENCIMENTO ASC;
    `;
    return query(sql, [codigoCliente]);
}

module.exports = {
    query,
    getTitulosFinanceiros,
    getTitulosAbertosPorCliente
};