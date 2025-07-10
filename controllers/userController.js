// ====================================================================================
//
//              DenyAnimeHub - Controller: Usuários (Versão à Prova de Falhas)
//
// Versão:        3.0 (Final e Completa)
// Descrição:     Este controller gerencia todas as operações relacionadas a usuários.
//                Foi reescrito para garantir exportações explícitas e evitar erros
//                de 'undefined' durante a importação no app.js.
//
// ====================================================================================

'use strict';
const { User } = require('../models');

const userController = {};

// FUNÇÕES DE ADMIN
userController.getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({ order: [['createdAt', 'DESC']], attributes: ['id', 'nome', 'email', 'role', 'createdAt', 'avatar'] });
        res.status(200).json({ success: true, count: users.length, data: users });
    } catch (err) { res.status(500).json({ success: false, error: 'Erro de servidor ao buscar usuários.' }); }
};

userController.updateUserByAdmin = async (req, res) => {
    try {
        const { nome, email, role } = req.body;
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
        await user.update({ nome, email, role });
        const updatedUser = user.get({ plain: true });
        delete updatedUser.senha;
        res.status(200).json({ success: true, data: updatedUser });
    } catch (err) { res.status(400).json({ success: false, error: 'Falha ao atualizar o usuário.' }); }
};

userController.deleteUserByAdmin = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
        if (Number(req.user.id) === Number(req.params.id)) return res.status(400).json({ success: false, error: 'Você não pode deletar sua própria conta.' });
        await user.destroy();
        res.status(200).json({ success: true, message: 'Usuário deletado com sucesso.' });
    } catch (err) { res.status(500).json({ success: false, error: 'Erro de servidor ao deletar usuário.' }); }
};

// FUNÇÕES DE USUÁRIO LOGADO
userController.updateUserProfile = async (req, res) => {
    try {
        const { nome, bio } = req.body;
        if (!nome || nome.trim() === '') return res.status(400).json({ success: false, error: 'O nome de usuário não pode ficar em branco.' });
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
        await user.update({ nome, bio });
        const updatedUser = user.get({ plain: true });
        delete updatedUser.senha;
        res.status(200).json({ success: true, message: 'Perfil atualizado!', user: updatedUser });
    } catch (err) { res.status(400).json({ success: false, error: 'Erro ao atualizar o perfil.' }); }
};

userController.updateUserAvatar = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, error: 'Nenhum arquivo de imagem enviado.' });
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
        user.avatar = `/uploads/avatars/${req.file.filename}`;
        await user.save();
        const updatedUser = user.get({ plain: true });
        delete updatedUser.senha;
        res.status(200).json({ success: true, message: 'Avatar atualizado!', user: updatedUser });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

userController.updateUserCapa = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, error: 'Nenhum arquivo de imagem enviado.' });
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
        user.capaPerfil = `/uploads/capas/${req.file.filename}`;
        await user.save();
        const updatedUser = user.get({ plain: true });
        delete updatedUser.senha;
        res.status(200).json({ success: true, message: 'Capa do perfil atualizada!', user: updatedUser });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

module.exports = userController;