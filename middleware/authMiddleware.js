// ====================================================================================
//
//              DenyAnimeHub - Middleware de Autenticação e Autorização
//
// Versão:        3.0 (Sharingan - Visão Completa do Usuário)
// Descrição:     Este middleware é o guardião do sistema. Ele contém três funções
//                distintas e cruciais:
//                1. `protegerOpcional`: Roda em todas as requisições para identificar
//                   um usuário logado, mas NUNCA bloqueia o acesso.
//                2. `proteger`: Bloqueia o acesso a rotas restritas se o usuário não
//                   estiver autenticado, com redirecionamento inteligente.
//                3. `admin`: Verifica se o usuário autenticado tem permissões de
//                   administrador. Deve ser usado sempre após `proteger`.
//
// ====================================================================================

'use strict';
const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Middleware para popular `req.user` se um token JWT válido for encontrado nos cookies.
 * Ele não bloqueia a requisição se o usuário não estiver logado, permitindo que
 * rotas públicas funcionem normalmente enquanto ainda exibem informações do usuário.
 */
exports.protegerOpcional = async (req, res, next) => {
    let token;

    if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    // Se não há token, simplesmente passa para o próximo middleware.
    if (!token) {
        return next();
    }

    try {
        // Verifica e decodifica o token usando o segredo.
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Busca o usuário no banco de dados pelo ID contido no token.
        // É crucial excluir a senha do resultado por segurança.
        req.user = await User.findByPk(decoded.id, {
            attributes: { exclude: ['senha'] }
        });
    } catch (err) {
        // Se o token for inválido, expirado ou houver outro erro,
        // o usuário é tratado como não logado. Limpa o cookie inválido.
        console.warn('[Auth Middleware] Token inválido ou expirado detectado. Limpando cookie.');
        res.clearCookie('token');
        req.user = null;
    }

    next();
};

/**
 * Middleware para PROTEGER rotas. Garante que apenas usuários autenticados
 * possam prosseguir. Se não autenticado, redireciona para a página de login.
 */
exports.proteger = (req, res, next) => {
    // A essa altura, `protegerOpcional` já deve ter tentado popular `req.user`.
    if (req.user && req.user.id) {
        // Usuário está logado e verificado, pode prosseguir.
        return next();
    }

    // Se não há usuário, o acesso é bloqueado.
    if (req.originalUrl.startsWith('/api/')) {
        // Para requisições de API, retorna um erro 401 (Não Autorizado) em JSON.
        return res.status(401).json({ success: false, error: 'Não autorizado. Faça o login para acessar este recurso.' });
    } else {
        // Para páginas normais, redireciona para a página de login.
        // Guarda a URL original que o usuário tentou acessar para redirecioná-lo
        // de volta após o login bem-sucedido.
        const redirectUrl = req.originalUrl;
        return res.redirect(`/login?erro=Acesso negado. Faça o login para continuar.&redirect=${encodeURIComponent(redirectUrl)}`);
    }
};

/**
 * Middleware para verificar se o usuário autenticado possui o cargo de 'admin'.
 * Este middleware DEVE ser usado sempre DEPOIS de `proteger`.
 */
exports.admin = (req, res, next) => {
    // `proteger` garante que `req.user` existe.
    if (req.user.role === 'admin') {
        // O usuário é um admin, pode prosseguir.
        return next();
    }
    
    // Se não for admin, o acesso é proibido.
    if (req.originalUrl.startsWith('/api/')) {
        // Para a API, retorna um erro 403 (Proibido) em JSON.
        return res.status(403).json({ success: false, error: 'Acesso negado. Este recurso é exclusivo para administradores.' });
    } else {
        // Para páginas normais, renderiza uma página de erro 403.
        return res.status(403).render('403', { layout: false, titulo: 'Acesso Negado' });
    }
};