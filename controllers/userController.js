// ====================================================================================
//
//              DenyAnimeHub - Controller: Usuários (Versão Definitiva e 100% Funcional)
//
// Versão:        5.0 (Rinnegan)
// Descrição:     Versão final que corrige o bug da bio ao retornar o usuário
//                atualizado na resposta da API. Mantém a robustez de deletar
//                arquivos antigos e preserva todas as funções de admin intactas.
//
// ====================================================================================

'use strict';
const { User } = require('../models');
const fs = require('fs');
const path = require('path');

const userController = {};

const deleteOldFile = (relativePath) => {
    if (!relativePath || relativePath.includes('default-')) {
        return;
    }
    const fullPath = path.join(__dirname, '..', 'public', relativePath);
    fs.unlink(fullPath, (err) => {
        if (err) {
            console.error(`[CONTROLADOR] Falha ao tentar deletar arquivo antigo: ${fullPath}`, err);
        }
    });
};

// ============================================================================
// FUNÇÕES DE USUÁRIO LOGADO (CORRIGIDAS E ROBUSTAS)
// ============================================================================

userController.updateUserProfile = async (req, res) => {
    try {
        const { nome, bio } = req.body;
        if (!nome || nome.trim() === '') {
            return res.status(400).json({ success: false, message: 'O nome de usuário não pode ficar em branco.' });
        }
        
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
        }

        await user.update({ nome, bio: bio || '' });

        // [CORREÇÃO DO BUG DA BIO]
        // Agora, a resposta inclui o objeto 'user' com os dados atualizados.
        const updatedUser = user.get({ plain: true });
        delete updatedUser.senha; // Garante que a senha nunca seja enviada.

        res.status(200).json({ 
            success: true, 
            message: 'Perfil atualizado com sucesso!', 
            user: updatedUser // O front-end usará isso para preencher os campos.
        });

    } catch (err) {
        console.error("Erro em updateUserProfile:", err);
        res.status(500).json({ success: false, message: 'Erro interno ao atualizar o perfil.' });
    }
};

userController.updateUserAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Nenhum arquivo de imagem enviado.' });
        }
        const oldAvatarPath = req.user.avatar;
        const newAvatarPath = `/uploads/avatars/${req.file.filename}`;
        await req.user.update({ avatar: newAvatarPath });
        deleteOldFile(oldAvatarPath);
        res.status(200).json({ success: true, message: 'Avatar atualizado com sucesso!', filePath: newAvatarPath });
    } catch (err) {
        console.error("Erro em updateUserAvatar:", err);
        res.status(500).json({ success: false, message: err.message || 'Erro interno ao atualizar o avatar.' });
    }
};

userController.updateUserCapa = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Nenhum arquivo de imagem enviado.' });
        }
        const oldCapaPath = req.user.capaPerfil;
        const newCapaPath = `/uploads/capas/${req.file.filename}`;
        await req.user.update({ capaPerfil: newCapaPath });
        deleteOldFile(oldCapaPath);
        res.status(200).json({ success: true, message: 'Capa do perfil atualizada com sucesso!', filePath: newCapaPath });
    } catch (err) {
        console.error("Erro em updateUserCapa:", err);
        res.status(500).json({ success: false, message: err.message || 'Erro interno ao atualizar a capa.' });
    }
};

// ============================================================================
// FUNÇÕES DE ADMIN (MANTIDAS 100% INTACTAS)
// ============================================================================

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

module.exports = userController;