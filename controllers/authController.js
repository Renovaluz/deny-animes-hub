const jwt = require('jsonwebtoken');
const db = require('../models');
const User = db.User;

// Função auxiliar para gerar e enviar o token
const enviarToken = (user, statusCode, res) => {
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });

    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 dias
    });

    // Remove a senha do objeto do usuário antes de enviar
    const userSemSenha = user.get({ plain: true });
    delete userSemSenha.senha;

    res.status(statusCode).json({
        success: true,
        user: userSemSenha,
        token
    });
};

// @desc    Registrar um novo usuário
// @route   POST /auth/registrar
exports.registrar = async (req, res, next) => {
    try {
        const { nome, email, senha } = req.body;
        const user = await User.create({ nome, email, senha });
        enviarToken(user, 201, res);
    } catch (error) {
        // Envia uma resposta de erro JSON mais clara
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ success: false, error: 'Este e-mail já está em uso.' });
        }
        res.status(500).json({ success: false, error: 'Erro no servidor ao registrar.' });
    }
};


// =========================================================================
// CORREÇÃO CRUCIAL APLICADA AQUI
// =========================================================================
// @desc    Fazer login de um usuário
// @route   POST /auth/login
exports.login = async (req, res, next) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({ success: false, error: 'Por favor, forneça e-mail e senha.' });
        }
        
        // CORRIGIDO: Usamos .scope('comSenha') para FORÇAR o Sequelize a incluir
        // o campo da senha na busca, ignorando o defaultScope.
        const user = await User.scope('comSenha').findOne({ where: { email } });

        if (!user) {
            return res.status(401).json({ success: false, error: 'Credenciais inválidas.' });
        }

        // Agora `user.senha` existe e podemos comparar
        const isMatch = await user.compararSenha(senha);

        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Credenciais inválidas.' });
        }
        
        enviarToken(user, 200, res);

    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ success: false, error: 'Erro no servidor.' });
    }
};
// =========================================================================
// FIM DA CORREÇÃO
// =========================================================================


// @desc    Fazer logout de um usuário
// @route   GET /auth/logout
exports.logout = (req, res) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });
    res.status(200).json({ success: true, data: {} });
};