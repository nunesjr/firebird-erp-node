const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Conexão com o banco de dados SQLite
const dbPath = path.join(__dirname, 'data', 'app.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Erro ao conectar ao banco de dados SQLite:', err.message);
    } else {
        console.log('✅ Conectado ao banco de dados SQLite.');
        // Cria a tabela de usuários se ela não existir
        createTables();
    }
});

function createTables() {
    db.serialize(() => {
        // Tabela para gerenciar os usuários da aplicação
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
        db.run(userTableSql, (err) => {
            if (err) {
                console.error('❌ Erro ao criar a tabela "users":', err.message);
            } else {
                console.log('✅ Tabela "users" verificada/criada com sucesso.');
                // A criação do usuário admin deve ser feita por um script de seed.
                // Exemplo: node src/scripts/seedAdmin.js
            }
        });

        // Tabela para cache de geocodificação
        const geocodeCacheTableSql = `
            CREATE TABLE IF NOT EXISTS geocode_cache (
                address TEXT PRIMARY KEY,
                lat REAL NOT NULL,
                lon REAL NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `;
        db.run(geocodeCacheTableSql, (err) => {
            if (err) {
                console.error('❌ Erro ao criar a tabela "geocode_cache":', err.message);
            } else {
                console.log('✅ Tabela "geocode_cache" verificada/criada com sucesso.');
            }
        });

        // Tabela para conferência de DAVs recebidos
        const conferenciaTableSql = `
            CREATE TABLE IF NOT EXISTS vendas_conferencia (
                dav_codigo INTEGER PRIMARY KEY,
                conferido INTEGER NOT NULL DEFAULT 0,
                data_conferencia DATETIME
            );
        `;
        db.run(conferenciaTableSql, (err) => {
            if (err) {
                console.error('❌ Erro ao criar a tabela "vendas_conferencia":', err.message);
            } else {
                console.log('✅ Tabela "vendas_conferencia" verificada/criada com sucesso.');
            }
        });

        // Tabela para armazenar os entregadores
        const entregadoresTableSql = `
            CREATE TABLE IF NOT EXISTS entregadores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL UNIQUE
            );
        `;
        db.run(entregadoresTableSql, (err) => {
            if (err) {
                console.error('❌ Erro ao criar a tabela "entregadores":', err.message);
            } else {
                console.log('✅ Tabela "entregadores" verificada/criada com sucesso.');
            }
        });

        // Tabela para rastrear o saldo de caixas retornáveis por cliente
        const caixasClienteTableSql = `
            CREATE TABLE IF NOT EXISTS caixas_cliente (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                codigoCliente INTEGER NOT NULL UNIQUE,
                quantidade INTEGER NOT NULL DEFAULT 0
            );
        `;
        db.run(caixasClienteTableSql, (err) => {
            if (err) {
                console.error('❌ Erro ao criar a tabela "caixas_cliente":', err.message);
            } else {
                console.log('✅ Tabela "caixas_cliente" verificada/criada com sucesso.');
            }
        });

        // Tabela para registrar os dados da entrega de uma venda
        const entregasTableSql = `
            CREATE TABLE IF NOT EXISTS entregas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vendaId INTEGER NOT NULL UNIQUE,
                entregadorId INTEGER,
                caixasSaida INTEGER DEFAULT 0,
                caixasRetorno INTEGER DEFAULT 0,
                conferidoPor TEXT,
                dataConferencia DATETIME,
                FOREIGN KEY (entregadorId) REFERENCES entregadores (id)
            );
        `;
        db.run(entregasTableSql, (err) => {
            if (err) {
                console.error('❌ Erro ao criar a tabela "entregas":', err.message);
            } else {
                console.log('✅ Tabela "entregas" verificada/criada com sucesso.');
            }
        });
    });
}

/*
function checkAndCreateAdmin() {
    const defaultUsername = 'admin';
    db.get('SELECT id FROM users WHERE username = ?', [defaultUsername], (err, row) => {
        if (err) {
            console.error('❌ Erro ao verificar usuário admin:', err.message);
            return;
        }
        if (!row) {
            // Crie um hash para a senha padrão
            const hashedPassword = bcrypt.hashSync('admin123', 10);
            const insertSql = 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)';
            db.run(insertSql, [defaultUsername, hashedPassword, 'admin'], function(insertErr) {
                if (insertErr) {
                    console.error('❌ Erro ao inserir usuário admin padrão:', insertErr.message);
                } else {
                    console.log(`🎉 Usuário \'admin\' padrão criado com sucesso! ID: ${this.lastID}`);
                    console.log('Lembre-se de alterar a senha padrão (admin123).');
                }
            });
        }
    });
}
*/

// Futuramente: Tabela para vincular entregador à venda
function createDelivererTable() {
    const delivererTableSql = `
        CREATE TABLE IF NOT EXISTS vendas_entregadores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo_venda INTEGER NOT NULL,
            nome_entregador TEXT NOT NULL,
            data_atribuicao DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (codigo_venda) REFERENCES orcamento (codigo)
        );
    `;
    db.run(delivererTableSql, (err) => {
        if (err) {
            console.error('❌ Erro ao criar a tabela "vendas_entregadores":', err.message);
        } else {
            console.log('✅ Tabela "vendas_entregadores" verificada/criada com sucesso.');
        }
    });
}
// Chame essa função quando for preciso
// createDelivererTable();

module.exports = db;
