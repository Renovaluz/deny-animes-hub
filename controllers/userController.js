const db = require('../models');
const User = db.User;

// ===================================
// FUNÇÕES PARA O ADMIN
// ===================================

// @desc    Admin: Obter todos os usuários
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({ 
            order: [['createdAt', 'DESC']],
            attributes: ['id', 'nome', 'email', 'role', 'createdAt'] // Exclui campos sensíveis
        });
        res.status(200).json({ success: true, data: users });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Admin: Atualiza um usuário
exports.updateUserByAdmin = async (req, res) => {
    try {
        const { nome, email, role } = req.body;
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
        
        await user.update({ nome, email, role });
        res.status(200).json({ success: true, data: user });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Admin: Deleta um usuário
exports.deleteUserByAdmin = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ success: false, error: 'Usuário não encontrado' });

        // Impede que o admin se delete
        if (req.user.id.toString() === req.params.id.toString()) {
            return res.status(400).json({ success: false, error: 'Você não pode deletar sua própria conta de administrador.' });
        }
        
        await user.destroy();
        res.status(200).json({ success: true, message: 'Usuário deletado com sucesso.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};


// ===================================
// FUNÇÕES PARA O USUÁRIO LOGADO
// ===================================

// @desc    Usuário: Atualiza o próprio perfil (nome, bio)
exports.updateUserProfile = async (req, res) => {
    try {
        const { nome, bio } = req.body;
        
        if (!nome || nome.trim() === '') {
            return res.status(400).json({ success: false, error: 'O nome de usuário não pode ficar em branco.' });
        }

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'Sessão inválida, usuário não encontrado.' });
        }

        user.nome = nome;
        user.bio = bio;
        await user.save();

        res.status(200).json({ success: true, message: 'Perfil atualizado com sucesso!', data: user });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message || 'Ocorreu um erro ao atualizar o perfil.' });
    }
};

// @desc    Usuário: Atualiza o próprio avatar
exports.updateUserAvatar = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, error: 'Nenhum arquivo de imagem enviado.' });

        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ success: false, error: 'Usuário não encontrado' });

        user.avatar = `/uploads/images/${req.file.filename}`;
        await user.save();
        
        res.status(200).json({ success: true, message: 'Avatar atualizado!', data: user });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Usuário: Atualiza a própria capa
exports.updateUserCapa = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, error: 'Nenhum arquivo de imagem enviado.' });

        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ success: false, error: 'Usuário não encontrado' });

        user.capaPerfil = `/uploads/images/${req.file.filename}`;
        await user.save();
        
        res.status(200).json({ success: true, message: 'Capa do perfil atualizada!', data: user });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};