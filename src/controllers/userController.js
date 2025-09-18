const sqliteService = require('../services/sqliteService');
const bcrypt = require('bcryptjs');

const getAllUsers = async (req, res, next) => {
    try {
        // Não retorne a senha para o frontend por segurança!
        const users = await sqliteService.all('SELECT id, username, role, codigoCliente, permissions FROM users');
        res.json(users);
    } catch (err) {
        next(err);
    }
};

const createUser = async (req, res, next) => {
    const { username, password, role, codigoCliente, permissions } = req.body;

    if (!username || !password) {
        const err = new Error('Nome de usuário e senha são obrigatórios.');
        err.status = 400;
        return next(err);
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const serializedPermissions = JSON.stringify(permissions || []);

        const result = await sqliteService.run(
            'INSERT INTO users (username, password, role, codigoCliente, permissions) VALUES (?, ?, ?, ?, ?)',
            [username, hashedPassword, role || 'user', codigoCliente || null, serializedPermissions]
        );

        res.status(201).json({ message: 'Usuário criado com sucesso.', userId: result.lastID });
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            const error = new Error('Nome de usuário já existe.');
            error.status = 409;
            return next(error);
        }
        next(err);
    }
};

const updateUser = async (req, res, next) => {
    const { id } = req.params;
    const { role, codigoCliente, password, permissions } = req.body;
    
    if (!id || isNaN(parseInt(id))) {
        const err = new Error('ID de usuário inválido.');
        err.status = 400;
        return next(err);
    }

    try {
        const updateFields = [];
        const params = [];

        if (role) {
            if (!['admin', 'user', 'cliente'].includes(role)) {
                const err = new Error('Role inválida. Valores permitidos: admin, user, cliente.');
                err.status = 400;
                return next(err);
            }
            updateFields.push('role = ?');
            params.push(role);
        }

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateFields.push('password = ?');
            params.push(hashedPassword);
        }

        if (codigoCliente !== undefined) {
            updateFields.push('codigoCliente = ?');
            params.push(codigoCliente === null ? null : parseInt(codigoCliente));
        }

        if (permissions !== undefined) {
            updateFields.push('permissions = ?');
            params.push(JSON.stringify(permissions));
        }

        if (updateFields.length === 0) {
            const err = new Error('Nenhum campo para atualizar fornecido.');
            err.status = 400;
            return next(err);
        }
        
        params.push(parseInt(id));
        const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;

        const result = await sqliteService.run(sql, params);

        if (result.changes === 0) {
            const err = new Error('Usuário não encontrado.');
            err.status = 404;
            return next(err);
        }

        res.json({ message: 'Usuário atualizado com sucesso.' });

    } catch (err) {
        next(err);
    }
};

const deleteUser = async (req, res, next) => {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
        const err = new Error('ID de usuário inválido.');
        err.status = 400;
        return next(err);
    }

    try {
        const result = await sqliteService.run('DELETE FROM users WHERE id = ?', [parseInt(id)]);

        if (result.changes === 0) {
            const err = new Error('Usuário não encontrado.');
            err.status = 404;
            return next(err);
        }

        res.json({ message: 'Usuário deletado com sucesso.' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getAllUsers,
    createUser,
    updateUser,
    deleteUser
};