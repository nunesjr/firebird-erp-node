const bcrypt = require('bcryptjs');
const readline = require('readline');
const db = require('../services/sqliteService');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

/**
 * Cria um usuário administrador com um nome de usuário e senha fornecidos.
 */
async function createAdmin() {
    console.log('--- Criação de Usuário Administrador ---');

    try {
        // Garante que a tabela exista antes de tentar inserir
        await db.initialize();

        const username = await new Promise(resolve => {
            rl.question('Digite o nome de usuário para o novo admin (padrão: admin): ', answer => {
                resolve(answer.trim() || 'admin');
            });
        });

        const existingUser = await db.get('SELECT id FROM users WHERE username = ?', [username]);
        if (existingUser) {
            console.log(`❌ O usuário "${username}" já existe. Saindo.`);
            rl.close();
            return;
        }

        const password = await new Promise(resolve => {
            rl.question(`Digite a senha para o usuário "${username}": `, answer => {
                if (!answer) {
                    console.log('❌ A senha não pode ser vazia. Saindo.');
                    rl.close();
                    resolve(null);
                } else {
                    resolve(answer);
                }
            });
        });

        if (!password) return;

        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)';
        
        const result = await db.run(sql, [username, hashedPassword, 'admin']);

        console.log(`
🎉 Usuário administrador "${username}" criado com sucesso! ID: ${result.lastID}`);
        console.log('Você já pode usar esta conta para fazer login.');

    } catch (err) {
        console.error('\n❌ Ocorreu um erro ao criar o usuário administrador:', err.message);
    } finally {
        rl.close();
        // Fecha a conexão com o banco de dados se a instância estiver disponível
        const dbInstance = db.dbInstance();
        if (dbInstance) {
            dbInstance.close();
            console.log('\n🚪 Conexão com o banco de dados fechada.');
        }
    }
}

createAdmin();
