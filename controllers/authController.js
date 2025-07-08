const jwt = require('jsonwebtoken'); 
const db = require('../models');
const User = db.User;

// Função auxiliar para gerar e enviar o token em um cookie
const enviarToken = (user, statusCode, res) => {
    try {
        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: '30d'
        });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 dias
        });

        const userSemSenha = user.get({ plain: true });
        delete userSemSenha.senha;

        res.status(statusCode).json({
            success: true,
            user: userSemSenha,
            token
        });
    } catch (error) {
        console.error("Erro ao gerar token:", error);
        res.status(500).json({ success: false, error: "Erro interno ao processar autenticação." });
    }
};

// @desc    Registrar um novo usuário
exports.registrar = async (req, res) => {
    try {
        const { nome, email, senha } = req.body;
        if (!nome || !email || !senha) {
            return res.status(400).json({ success: false, error: 'Por favor, preencha todos os campos.' });
        }
        const user = await User.create({ nome, email, senha });
        enviarToken(user, 201, res);
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ success: false, error: 'Este e-mail já está em uso.' });
        }
        console.error("Erro no registro:", error);
        res.status(500).json({ success: false, error: 'Erro no servidor ao registrar.' });
    }
};

// @desc    Fazer login de um usuário
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
        
        enviarToken(user, 200, res);

    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ success: false, error: 'Erro no servidor durante o login.' });
    }
};

// ==========================================================
// CORREÇÃO APLICADA AQUI
// ==========================================================
// @desc    Fazer logout de um usuário
exports.logout = (req, res) => {
    // Limpa o cookie 'token' fazendo-o expirar imediatamente.
    res.cookie('token', 'none', {
        expires: new Date(Date.now()), // Expira agora
        httpOnly: true
    });
    
    // Redireciona o navegador para a página de login.
    res.redirect('/login');
};
// ==========================================================
// FIM DA CORREÇÃO
// ==========================================================