// controllers/postController.js

const db = require('../models');
const Post = db.Post;

exports.getAllPosts = async (req, res) => {
    try {
        const posts = await Post.findAll({
            order: [['createdAt', 'DESC']],
            include: { model: db.User, as: 'autor', attributes: ['id', 'nome', 'avatar'] }
        });
        res.status(200).json({ success: true, data: posts });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro de Servidor ao buscar notícias.' });
    }
};

exports.getPostById = async (req, res) => {
    try {
        const post = await Post.findByPk(req.params.id, {
            include: { model: db.User, as: 'autor', attributes: ['id', 'nome', 'avatar'] }
        });
        if (!post) return res.status(404).json({ success: false, error: 'Notícia não encontrada.' });
        res.status(200).json({ success: true, data: post });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro de Servidor.' });
    }
};

exports.createPost = async (req, res) => {
    try {
        const emDestaque = req.body.emDestaque === 'on' || req.body.emDestaque === true;
        const postData = { ...req.body, emDestaque, autorId: req.user.id };
        if (!postData.id) delete postData.id;

        const novoPost = await Post.create(postData);
        const postCompleto = await Post.findByPk(novoPost.id, {
            include: { model: db.User, as: 'autor', attributes: ['id', 'nome', 'avatar'] }
        });
        res.status(201).json({ success: true, data: postCompleto });
    } catch (err) {
        console.error("Erro ao criar notícia:", err);
        res.status(400).json({ success: false, error: err.message || 'Erro ao processar requisição.' });
    }
};

exports.updatePost = async (req, res) => {
    try {
        let post = await Post.findByPk(req.params.id);
        if (!post) return res.status(404).json({ success: false, error: 'Notícia não encontrada.' });
        
        const emDestaque = req.body.emDestaque === 'on' || req.body.emDestaque === true;
        await post.update({ ...req.body, emDestaque });
        
        const postAtualizado = await Post.findByPk(req.params.id, {
             include: { model: db.User, as: 'autor', attributes: ['id', 'nome', 'avatar'] }
        });
        res.status(200).json({ success: true, data: postAtualizado });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

exports.deletePost = async (req, res) => {
    try {
        const post = await Post.findByPk(req.params.id);
        if (!post) return res.status(404).json({ success: false, error: 'Notícia não encontrada.' });
        await post.destroy();
        res.status(200).json({ success: true, message: 'Notícia deletada com sucesso.' });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro de Servidor.' });
    }
};