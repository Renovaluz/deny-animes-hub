'use strict';
const jwt = require('jsonwebtoken'); 
const { User } = require('../models');

// Função auxiliar para gerar e enviar o token em um cookie
const enviarTokenResponse = (user, statusCode, res) => {
    try {
        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: '30d'
        });

        res.cookie('token', token, {
            httpOnly: true, // Impede acesso via JavaScript no cliente (mais seguro)
            secure: process.env.NODE_ENV === 'production', // Envia apenas em HTTPS em produção
            sameSite: 'strict', // Proteção contra ataques CSRF
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 dias em milissegundos
        });

        // Remove a senha do objeto de usuário antes de enviar a resposta
        const userSemSenha = user.get({ plain: true });
        delete userSemSenha.senha;

        res.status(statusCode).json({
            success: true,
            user: userSemSenha,
        });
    } catch (error) {
        console.error("Erro ao gerar token:", error);
        res.status(500).json({ success: false, error: "Erro interno ao processar autenticação." });
    }
};

/**
 * @desc    Registrar um novo usuário
 * @route   POST /api/auth/registrar
 */
exports.registrar = async (req, res) => {
    try {
        const { nome, email, senha } = req.body;
        if (!nome || !email || !senha) {
            return res.status(400).json({ success: false, error: 'Por favor, preencha todos os campos.' });
        }
        if (senha.length < 6) {
            return res.status(400).json({ success: false, error: 'A senha deve ter no mínimo 6 caracteres.' });
        }

        const user = await User.create({ nome, email, senha });
        
        // Não faz login automático, apenas informa o sucesso.
        res.status(201).json({
            success: true,
            message: 'Conta criada com sucesso! Faça o login para continuar.'
        });

    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ success: false, error: 'Este e-mail já está em uso.' });
        }
        console.error("Erro no registro:", error);
        res.status(500).json({ success: false, error: 'Erro no servidor ao registrar.' });
    }
};

/**
 * @desc    Fazer login de um usuário
 * @route   POST /api/auth/login
 */
exports.login = async (req, res) => {
    try {
        const { email, senha } = req.body;
        if (!email || !senha) {
            return res.status(400).json({ success: false, error: 'Por favor, forneça e-mail e senha.' });
        }
        
        // Usa o escopo 'comSenha' para incluir o campo de senha na busca
        const user = await User.scope('comSenha').findOne({ where: { email } });

        if (!user || !(await user.compararSenha(senha))) {
            return res.status(401).json({ success: false, error: 'E-mail ou senha inválidos.' });
        }
        
        // Se o login for bem-sucedido, envia o token na resposta
        enviarTokenResponse(user, 200, res);

    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ success: false, error: 'Erro no servidor durante o login.' });
    }
};

/**
 * @desc    Fazer logout de um usuário. Esta ação limpa o cookie de autenticação
 *          e redireciona o navegador do usuário para a página de login.
 * @route   GET /auth/logout  (Nota: A rota deve ser '/auth/logout' e não '/api/auth/logout')
 */
exports.logout = (req, res) => {
    // 1. Limpa o cookie 'token' do navegador do usuário.
    //    Definir um valor simbólico e um tempo de expiração no passado ou
    //    muito curto garante que o navegador o descarte.
    res.cookie('token', 'loggedout', {
        expires: new Date(Date.now() + 1000), // Expira em 1 segundo
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    });
    
    // 2. Envia uma resposta de redirecionamento para o navegador.
    //    O status 302 é o código padrão para redirecionamentos temporários.
    //    Adicionamos um parâmetro de query '?sucesso=...' para que a página
    //    de login possa exibir uma mensagem amigável.
    res.redirect('/login?sucesso=Você foi desconectado com sucesso!');
};