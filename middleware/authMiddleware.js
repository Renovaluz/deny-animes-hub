// middleware/authMiddleware.js

const jwt = require('jsonwebtoken');
const db = require('../models');
const User = db.User;

// Função para responder com erro JSON para requisições de API
const handleApiAuthError = (res, statusCode, message) => {
    return res.status(statusCode).json({ success: false, error: message });
};

// Middleware para proteger rotas, agora "API-aware"
exports.proteger = async (req, res, next) => {
    let token;

    if (req.cookies.token) {
        try {
            token = req.cookies.token;
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findByPk(decoded.id, {
                attributes: { exclude: ['senha'] }
            });

            if (!req.user) {
                // Se o usuário não existe mais no DB mas o token é válido
                return req.originalUrl.startsWith('/api')
                    ? handleApiAuthError(res, 401, 'Usuário não encontrado, autorização negada.')
                    : res.redirect('/login');
            }

            next();
        } catch (error) {
            console.error('Erro de token:', error.message);
            return req.originalUrl.startsWith('/api')
                ? handleApiAuthError(res, 401, 'Token inválido ou expirado.')
                : res.redirect('/login?erro=Sessão inválida, por favor, faça login novamente.');
        }
    }

    if (!token) {
        return req.originalUrl.startsWith('/api')
            ? handleApiAuthError(res, 401, 'Não autorizado, nenhum token encontrado.')
            : res.redirect('/login');
    }
};

// Middleware para restringir acesso a Admins, agora "API-aware"
exports.admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return req.originalUrl.startsWith('/api')
            ? handleApiAuthError(res, 403, 'Acesso negado. Requer privilégios de administrador.')
            : res.status(403).render('403', { layout: false, titulo: 'Acesso Negado' });
    }
};