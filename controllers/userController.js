'use strict';
const db = require('../models');
const fs = require('fs');
const path = require('path');

const deletarArquivoAntigo = (filePath) => {
    if (filePath && !filePath.includes('default-')) {
        const fullPath = path.join(__dirname, '..', 'public', filePath);
        fs.unlink(fullPath, (err) => {
            if (err) { console.error(`[CONTROLADOR] Falha ao tentar deletar arquivo antigo: ${fullPath}`, err); }
        });
    }
};

const userController = {};

// Funções de Perfil do Usuário Logado
userController.updateUserProfile = async (req, res) => { try { const { nome, bio } = req.body; if (!nome || nome.trim() === '') { return res.status(400).json({ success: false, message: 'O nome de usuário não pode ficar em branco.' }); } const user = await db.User.findByPk(req.user.id); if (!user) { return res.status(404).json({ success: false, message: 'Usuário não encontrado.' }); } await user.update({ nome, bio: bio || '' }); const updatedUser = user.get({ plain: true }); delete updatedUser.senha; res.status(200).json({ success: true, message: 'Perfil atualizado com sucesso!', user: updatedUser }); } catch (err) { console.error("Erro em updateUserProfile:", err); res.status(500).json({ success: false, message: 'Erro interno ao atualizar o perfil.' }); } };
userController.updateUserAvatar = async (req, res) => { try { if (!req.file) { return res.status(400).json({ success: false, message: 'Nenhum arquivo de imagem enviado.' }); } const oldAvatarPath = req.user.avatar; const newAvatarPath = `/uploads/avatars/${req.file.filename}`; await req.user.update({ avatar: newAvatarPath }); deletarArquivoAntigo(oldAvatarPath); res.status(200).json({ success: true, message: 'Avatar atualizado com sucesso!', filePath: newAvatarPath }); } catch (err) { console.error("Erro em updateUserAvatar:", err); res.status(500).json({ success: false, message: err.message || 'Erro interno ao atualizar o avatar.' }); } };
userController.updateUserCapa = async (req, res) => { try { if (!req.file) { return res.status(400).json({ success: false, message: 'Nenhum arquivo de imagem enviado.' }); } const oldCapaPath = req.user.capaPerfil; const newCapaPath = `/uploads/capas/${req.file.filename}`; await req.user.update({ capaPerfil: newCapaPath }); deletarArquivoAntigo(oldCapaPath); res.status(200).json({ success: true, message: 'Capa do perfil atualizada com sucesso!', filePath: newCapaPath }); } catch (err) { console.error("Erro em updateUserCapa:", err); res.status(500).json({ success: false, message: err.message || 'Erro interno ao atualizar a capa.' }); } };

// Funções de Gerenciamento de Admin
userController.getAllUsers = async (req, res) => { try { const users = await db.User.findAll({ order: [['createdAt', 'DESC']], attributes: ['id', 'nome', 'email', 'role', 'createdAt', 'avatar'] }); res.status(200).json({ success: true, data: users }); } catch (err) { res.status(500).json({ success: false, error: 'Erro de servidor ao buscar usuários.' }); } };
userController.getSingleUser = async (req, res) => { try { const user = await db.User.findByPk(req.params.id); if (!user) { return res.status(404).json({ success: false, error: 'Usuário não encontrado.' }); } res.status(200).json({ success: true, data: user.get({ plain: true }) }); } catch (error) { console.error("Erro ao buscar usuário:", error); res.status(500).json({ success: false, error: 'Erro no servidor.' }); } };
userController.updateUserByAdmin = async (req, res) => { try { const { nome, email, role } = req.body; const user = await db.User.findByPk(req.params.id); if (!user) return res.status(404).json({ success: false, error: 'Usuário não encontrado.' }); await user.update({ nome, email, role }); const updatedUser = user.get({ plain: true }); delete updatedUser.senha; res.status(200).json({ success: true, data: updatedUser, message: 'Usuário atualizado com sucesso.' }); } catch (err) { res.status(400).json({ success: false, error: 'Falha ao atualizar o usuário.' }); } };
userController.deleteUserByAdmin = async (req, res) => { try { const user = await db.User.findByPk(req.params.id); if (!user) return res.status(404).json({ success: false, error: 'Usuário não encontrado.' }); if (Number(req.user.id) === Number(req.params.id)) return res.status(400).json({ success: false, error: 'Você não pode deletar sua própria conta.' }); await user.destroy(); res.status(200).json({ success: true, message: 'Usuário deletado com sucesso.' }); } catch (err) { res.status(500).json({ success: false, error: 'Erro de servidor ao deletar usuário.' }); } };

module.exports = userController;