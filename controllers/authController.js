'use strict';
const jwt = require('jsonwebtoken'); 
const crypto = require('crypto');
const { User, sequelize } = require('../models'); // Importa a instância do sequelize para usar Op
const sendEmail = require('../utils/sendEmail');

// Sua função original, 100% preservada
const enviarTokenResponse = (user, statusCode, res) => {
    try {
        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: '30d'
        });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

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

// Sua função original, 100% preservada
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

// Sua função original, 100% preservada
exports.login = async (req, res) => {
    try {
        const { email, senha } = req.body;
        if (!email || !senha) {
            return res.status(400).json({ success: false, error: 'Por favor, forneça e-mail e senha.' });
        }
        
        const user = await User.scope('comSenha').findOne({ where: { email } });

        if (!user || !(await user.compararSenha(senha))) {
            return res.status(401).json({ success: false, error: 'E-mail ou senha inválidos.' });
        }
        
        enviarTokenResponse(user, 200, res);

    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ success: false, error: 'Erro no servidor durante o login.' });
    }
};

// Sua função original, 100% preservada
exports.logout = (req, res) => {
    res.cookie('token', 'loggedout', {
        expires: new Date(Date.now() + 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    });
    res.redirect('/login?sucesso=Você foi desconectado com sucesso!');
};

// Lógica para "Esqueci a Senha"
exports.forgotPassword = async (req, res) => {
    try {
        const user = await User.findOne({ where: { email: req.body.email } });

        if (!user) {
            return res.status(404).json({ success: false, error: 'Não há usuário com este e-mail.' });
        }

        const resetToken = user.getResetPasswordToken();
        await user.save({ validate: false });

        const messageToUser = `<h1>Você solicitou uma redefinição de senha</h1><p>Use o seguinte código para redefinir sua senha. Ele é válido por 10 minutos:</p><h2>${resetToken}</h2><p>Se você não solicitou isso, ignore este e-mail.</p>`;
        const messageToAdmin = `<h1>Solicitação de Reset de Senha</h1><p>O usuário abaixo solicitou uma redefinição de senha:</p><ul><li><strong>ID do Usuário:</strong> ${user.id}</li><li><strong>Email:</strong> ${user.email}</li><li><strong>Código de Redefinição:</strong> ${resetToken}</li></ul>`;

        try {
            await sendEmail({ email: user.email, subject: 'Redefinição de Senha - DenyAnimeHub', message: messageToUser });
            await sendEmail({ email: 'denyneves14@gmail.com', subject: '[ADMIN] Solicitação de Reset de Senha', message: messageToAdmin });
            
            res.status(200).json({ success: true, message: 'E-mail enviado com sucesso! Verifique sua caixa de entrada (e spam).' });

        } catch (error) {
            console.error("Erro ao enviar email:", error);
            user.resetPasswordToken = null;
            user.resetPasswordExpire = null;
            await user.save({ validate: false });
            return res.status(500).json({ success: false, error: 'Não foi possível enviar o e-mail.' });
        }

    } catch (error) {
        console.error("Erro em forgotPassword:", error);
        res.status(500).json({ success: false, error: 'Erro no servidor.' });
    }
};

// Lógica para Redefinir a Senha
exports.resetPassword = async (req, res) => {
    try {
        const { email, token, novaSenha } = req.body;
        
        const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.scope('comSenha').findOne({
            where: {
                email,
                resetPasswordToken,
                resetPasswordExpire: { [sequelize.Op.gt]: Date.now() }
            }
        });

        if (!user) {
            return res.status(400).json({ success: false, error: 'Código inválido ou expirado.' });
        }

        user.senha = novaSenha;
        user.resetPasswordToken = null;
        user.resetPasswordExpire = null;
        await user.save();
        
        enviarTokenResponse(user, 200, res);

    } catch (error) {
        console.error("Erro em resetPassword:", error);
        res.status(500).json({ success: false, error: 'Erro no servidor ao redefinir a senha.' });
    }
};