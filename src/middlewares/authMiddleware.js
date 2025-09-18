const jwt = require('jsonwebtoken');

/**
 * Middleware para autenticar um token JWT.
 * Protege uma rota, exigindo um token válido no header Authorization.
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        // Usa o next com um erro para ser capturado pelo errorHandler
        const error = new Error('Token de autenticação ausente.');
        error.status = 401; // Unauthorized
        return next(error);
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.warn('🚫 Tentativa de acesso com token inválido:', err.message);
            const error = new Error('Token de autenticação inválido ou expirado.');
            error.status = 403; // Forbidden
            return next(error);
        }
        req.user = user;
        next();
    });
}

/**
 * Middleware para verificar se o usuário autenticado é um administrador.
 * Deve ser usado *após* o middleware authenticateToken.
 */
function requireAdmin(req, res, next) {
    if (req.user?.role !== 'admin') {
        console.warn(`🚫 Usuário ${req.user?.username} (role: ${req.user?.role}) tentou acessar recurso de admin.`);
        const error = new Error('Acesso restrito: apenas administradores.');
        error.status = 403; // Forbidden
        return next(error);
    }
    next();
}

/**
 * Middleware para verificar se o usuário autenticado possui uma permissão específica.
 * Deve ser usado *após* o middleware authenticateToken.
 * @param {string|Array<string>} requiredPermission - A permissão ou lista de permissões necessárias.
 */
function requirePermission(requiredPermission) {
    return (req, res, next) => {
        if (!req.user || !req.user.permissions) {
            const error = new Error('Acesso negado: Permissões de usuário não encontradas.');
            error.status = 403;
            return next(error);
        }

        const userPermissions = req.user.permissions;

        const hasPermission = Array.isArray(requiredPermission)
            ? requiredPermission.some(perm => userPermissions.includes(perm))
            : userPermissions.includes(requiredPermission);

        if (!hasPermission) {
            console.warn(`🚫 Usuário ${req.user?.username} (role: ${req.user?.role}) tentou acessar recurso sem a permissão necessária: ${requiredPermission}.`);
            const error = new Error('Acesso negado: Você não tem permissão para acessar este recurso.');
            error.status = 403;
            return next(error);
        }
        next();
    };
}

/**
 * Middleware de tratamento de erros centralizado.
 * Deve ser o último middleware a ser adicionado no app.
 */
function handleErrors(err, req, res, next) {
    console.error('❌ Erro não tratado:', err);

    const status = err.status || 500;
    const message = err.message || 'Erro interno do servidor.';

    // Em ambiente de produção, não envie o stack trace do erro
    const errorResponse = {
        error: {
            message: message,
            ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
        }
    };

    res.status(status).json(errorResponse);
}

/**
 * Middleware para verificar se o usuário autenticado é um cliente.
 * Deve ser usado *após* o middleware authenticateToken.
 */
function requireCliente(req, res, next) {
    // Permite acesso se o usuário for cliente OU admin, já que admin pode precisar testar a visão do cliente.
    if (req.user?.role !== 'cliente' && req.user?.role !== 'admin') {
        console.warn(`🚫 Usuário ${req.user?.username} (role: ${req.user?.role}) tentou acessar recurso de cliente.`);
        const error = new Error('Acesso restrito: apenas clientes.');
        error.status = 403; // Forbidden
        return next(error);
    }
    next();
}

module.exports = {
    authenticateToken,
    requireAdmin,
    requirePermission,
    requireCliente,
    handleErrors
};
