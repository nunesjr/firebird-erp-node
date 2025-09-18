const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const sqliteService = require('../services/sqliteService');
const firebirdService = require('../services/firebirdService');

// --- Schemas de Validação com Joi ---
const loginSchema = Joi.object({
    username: Joi.string().required().messages({
        'any.required': 'O nome de usuário é obrigatório.',
        'string.empty': 'O nome de usuário não pode ser vazio.'
    }),
    password: Joi.string().required().messages({
        'any.required': 'A senha é obrigatória.',
        'string.empty': 'A senha não pode ser vazia.'
    }),
});

const adminRegisterSchema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().min(6).required(),
    codigoCliente: Joi.number().optional().allow(null),
    role: Joi.string().valid('user', 'cliente', 'admin').optional().default('user'),
    permissions: Joi.array().items(Joi.string()).optional().default([])
});

// --- Controladores ---

const login = async (req, res, next) => {
    const { error } = loginSchema.validate(req.body);
    if (error) {
        const err = new Error(error.details[0].message);
        err.status = 400;
        return next(err);
    }

    const { username, password } = req.body;
    
    try {
        const user = await sqliteService.get('SELECT * FROM users WHERE username = ?', [username]);

        if (!user) {
            console.warn(`🚫 Tentativa de login falha: Usuário '${username}' não encontrado.`);
            const err = new Error('Usuário ou senha inválidos.');
            err.status = 401;
            return next(err);
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            console.warn(`🚫 Tentativa de login falha: Senha incorreta para '${username}'.`);
            const err = new Error('Usuário ou senha inválidos.');
            err.status = 401;
            return next(err);
        }

        let convenioDesconto = 0;
        let apelidoCliente = null;
        // Se o usuário for um cliente, busca o desconto no Firebird
        if (user.role === 'cliente' && user.codigoCliente) {
            try {
                const clienteData = await firebirdService.query('SELECT CONVENIO_DESCONTO, APELIDO FROM CLIENTE WHERE CODIGO = ?', [user.codigoCliente]);
                if (clienteData.length > 0) {
                    convenioDesconto = clienteData[0].CONVENIO_DESCONTO || 0;
                    apelidoCliente = clienteData[0].APELIDO || null;
                }
            } catch (fbError) {
                // Se houver erro ao buscar no firebird, loga o erro mas não impede o login.
                // O desconto será 0.
                console.error(`🔥 Erro ao buscar desconto para o cliente ${user.codigoCliente} no Firebird:`, fbError.message);
            }
        }

        const token = jwt.sign(
            {
                username: user.username,
                role: user.role,
                codigoCliente: user.codigoCliente || null,
                convenioDesconto: convenioDesconto,
                apelido: apelidoCliente, // Adicionado apelido
                permissions: user.permissions || [] // Adiciona permissões ao payload do token
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.json({
            message: 'Login realizado com sucesso!',
            token,
            user: {
                username: user.username,
                role: user.role,
                codigoCliente: user.codigoCliente || null,
                convenioDesconto: convenioDesconto,
                apelido: apelidoCliente, // Adicionado apelido
                permissions: user.permissions || [] // Adiciona permissões ao objeto de usuário retornado
            },
        });
    } catch (err) {
        next(err);
    }
};

const registerAdmin = async (req, res, next) => {
    const { error } = adminRegisterSchema.validate(req.body);
    if (error) {
        const err = new Error(error.details[0].message);
        err.status = 400;
        return next(err);
    }
    const { username, password, codigoCliente, role, permissions } = req.body;

    try {
        const existingUser = await sqliteService.get('SELECT id FROM users WHERE username = ?', [username]);
        if (existingUser) {
            const err = new Error('Nome de usuário já existe.');
            err.status = 409;
            return next(err);
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const finalRole = role || (codigoCliente ? 'cliente' : 'user');
        const serializedPermissions = JSON.stringify(permissions || []);
        
        const sqlInsert = 'INSERT INTO users (username, password, role, codigoCliente, permissions) VALUES (?, ?, ?, ?, ?)';
        await sqliteService.run(sqlInsert, [username, hashedPassword, finalRole, codigoCliente, serializedPermissions]);

        res.status(201).json({
            message: `Usuário '${username}' criado com sucesso com a role '${finalRole}'.`,
            username: username,
            role: finalRole,
            codigoCliente,
            permissions: permissions || []
        });
    } catch (err) {
        next(err);
    }
};

const verifyToken = (req, res) => {
    res.json({
        valid: true,
        user: {
            username: req.user.username,
            role: req.user.role,
            codigoCliente: req.user.codigoCliente || null,
            permissions: req.user.permissions || [] // Adiciona permissões ao objeto de usuário retornado
        },
    });
};

module.exports = {
    login,
    registerAdmin,
    verifyToken
};