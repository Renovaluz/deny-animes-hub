const db = require('../models');
const User = db.User;
const jwt = require('jsonwebtoken');

// Função para gerar o token e enviá-lo como cookie
const enviarToken = (user, statusCode, res) => {
    try {
        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: '1d'
        });

        const options = {
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Adiciona segurança em produção
            sameSite: 'strict'
        };

        res.status(statusCode).cookie('token', token, options).redirect('/perfil');
    } catch (error) {
        console.error("Erro ao gerar token:", error);
        res.status(500).redirect('/login?erro=Erro%20interno%20ao%20gerar%20sessao');
    }
};

// @desc    Registrar um novo usuário
exports.registrar = async (req, res) => {
    const { nome, email, senha } = req.body;
    try {
        if (!nome || !email || !senha) {
            throw new Error("Todos os campos são obrigatórios.");
        }
        await User.create({ nome, email, senha });
        res.status(201).redirect('/login?sucesso=true#login-form');
    } catch (error) {
        console.error("Erro no registro:", error);
        const mensagemErro = encodeURIComponent('Erro ao registrar. O email ou nome de usuário pode já estar em uso.');
        res.redirect(`/login?erro=${mensagemErro}#register-form`);
    }
};

// @desc    Fazer login
exports.login = async (req, res) => {
    const { email, senha } = req.body;
    try {
        if (!email || !senha) {
            throw new Error('Por favor, forneça email e senha.');
        }

        // Busca o usuário com a senha usando o scope definido no Model
        const user = await User.scope('comSenha').findOne({ where: { email } });

        // A verificação mais importante:
        // 1. O usuário existe?
        // 2. A senha fornecida bate com a senha hasheada no banco?
        if (!user || !(await user.compararSenha(senha))) {
            // Se qualquer uma das condições falhar, as credenciais são inválidas.
            throw new Error('Credenciais inválidas.');
        }

        // Se passou, as credenciais estão corretas. Gerar e enviar o token.
        enviarToken(user, 200, res);
    } catch (error) {
        console.error("Erro no login:", error);
        const mensagemErro = encodeURIComponent(error.message);
        res.redirect(`/login?erro=${mensagemErro}`);
    }
};

// @desc    Fazer logout
exports.logout = (req, res) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 5 * 1000),
        httpOnly: true
    });
    res.status(200).redirect('/');
};