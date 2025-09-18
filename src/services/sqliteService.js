const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const util = require('util');

// O caminho agora precisa voltar um nível, pois o serviço está em src/
const dbPath = path.join(__dirname, '..', '..', 'data', 'app.db');

let db;

/**
 * Conecta ao banco de dados SQLite.
 * @returns {Promise<sqlite3.Database>} Instância do banco de dados.
 */
const connectDb = () => {
    if (db) return Promise.resolve(db);

    return new Promise((resolve, reject) => {
        const newDb = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('❌ Erro ao conectar ao banco de dados SQLite:', err.message);
                reject(err);
            } else {
                console.log('✅ Conectado ao banco de dados SQLite.');
                db = newDb;
                resolve(db);
            }
        });
    });
};

/**
 * Executa uma query que não retorna linhas (CREATE, INSERT, UPDATE, DELETE).
 * @param {string} sql A query SQL.
 * @param {Array} params Os parâmetros da query.
 * @returns {Promise<{lastID: number, changes: number}>}
 */
const run = (sql, params = []) => {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await connectDb();
            db.run(sql, params, function (err) {
                if (err) {
                    console.error('Erro ao executar a query (run):', sql, params);
                    reject(err);
                } else {
                    // O resultado da operação (lastID, changes) está no contexto 'this'
                    resolve({ lastID: this.lastID, changes: this.changes });
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};

/**
 * Executa uma query e retorna a primeira linha.
 * @param {string} sql A query SQL.
 * @param {Array} params Os parâmetros da query.
 * @returns {Promise<Object|null>}
 */
const get = async (sql, params = []) => {
    const db = await connectDb();
    const getAsync = util.promisify(db.get.bind(db));
    const row = await getAsync(sql, params);
    if (row && row.permissions) {
        try {
            row.permissions = JSON.parse(row.permissions);
        } catch (e) {
            console.warn('Erro ao parsear permissões para o usuário', row.username, ':', e);
            row.permissions = [];
        }
    }
    return row;
};

/**
 * Executa uma query e retorna todas as linhas.
 * @param {string} sql A query SQL.
 * @param {Array} params Os parâmetros da query.
 * @returns {Promise<Array>}
 */
const all = async (sql, params = []) => {
    const db = await connectDb();
    const allAsync = util.promisify(db.all.bind(db));
    const rows = await allAsync(sql, params);
    return rows.map(row => {
        if (row.permissions) {
            try {
                row.permissions = JSON.parse(row.permissions);
            } catch (e) {
                console.warn('Erro ao parsear permissões para o usuário', row.username, ':', e);
                row.permissions = [];
            }
        }
        return row;
    });
};

/**
 * Busca o status de conferência para uma lista de DAVs.
 * @param {Array<number>} davCodigos - Uma lista de códigos DAV.
 * @returns {Promise<Map<number, number>>} Um mapa onde a chave é o dav_codigo e o valor é o status (1 ou 0).
 */
const getConferenciaStatus = async (davCodigos) => {
    if (!davCodigos || davCodigos.length === 0) {
        return new Map();
    }

    // O SQLite não suporta arrays diretamente, então criamos os placeholders (?) dinamicamente
    const placeholders = davCodigos.map(() => '?').join(',');
    const sql = `SELECT dav_codigo, conferido FROM vendas_conferencia WHERE dav_codigo IN (${placeholders})`;

    const rows = await all(sql, davCodigos);

    // Converte o array de resultados em um Map para fácil acesso
    const statusMap = new Map();
    for (const row of rows) {
        statusMap.set(row.dav_codigo, row.conferido);
    }
    return statusMap;
};

/**
 * Inicializa o banco de dados e cria as tabelas se não existirem.
 */
const initialize = async () => {
    try {
        const userTableSql = `
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                codigoCliente INTEGER,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await run(userTableSql);
        console.log('✅ Tabela "users" verificada/criada com sucesso.');

        // Adicionar coluna 'permissions' se não existir
        const checkColumnSql = "PRAGMA table_info(users);";
        const columns = await all(checkColumnSql);
        const hasPermissionsColumn = columns.some(column => column.name === 'permissions');

        if (!hasPermissionsColumn) {
            const addColumnSql = "ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT '[]';";
            await run(addColumnSql);
            console.log('✅ Coluna "permissions" adicionada à tabela "users".');
        }

        // A criação do usuário admin deve ser feita por um script de seed separado.
        // Exemplo: node src/scripts/seedAdmin.js

    } catch (err) {
        console.error('❌ Erro ao inicializar o banco de dados SQLite:', err.message);
        throw err; // Propaga o erro para quem chamou a inicialização
    }
};

module.exports = {
    run,
    get,
    all,
    initialize,
    getConferenciaStatus, // Exporta a nova função
    // Exporta a função de conexão para poder fechar o pool se necessário
    dbInstance: () => db,
};
