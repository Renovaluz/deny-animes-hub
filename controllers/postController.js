// ====================================================================================
//              DenyAnimeHub - Controller: Posts (Versão Final com Slugs)
// ====================================================================================

'use strict';
const { Post, User, sequelize } = require('../models');
const slugify = require('../utils/slugify');

exports.createPost = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { titulo, conteudo, imagemDestaque, categoria, tags, emDestaque } = req.body;
        
        if (!titulo || !conteudo) {
            await transaction.rollback();
            return res.status(400).json({ success: false, error: 'Título e conteúdo são obrigatórios.' });
        }

        const slug = slugify(titulo);

        const postData = {
            titulo,
            slug,
            conteudo,
            imagemDestaque: imagemDestaque || '/images/placeholder_news.png',
            categoria,
            tags,
            emDestaque: emDestaque === 'on' || emDestaque === true,
            autorId: req.user.id,
            autorNome: req.user.nome
        };

        const novoPost = await Post.create(postData, { transaction });
        await transaction.commit();

        res.status(201).json({ success: true, data: novoPost });
    } catch (error) {
        await transaction.rollback();
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ success: false, error: 'Uma notícia com este título já existe.' });
        }
        console.error("Erro ao criar post:", error);
        res.status(500).json({ success: false, error: 'Erro interno ao criar a notícia.' });
    }
};

exports.getAllPosts = async (req, res) => {
    try {
        const posts = await Post.findAll({
            order: [['createdAt', 'DESC']],
            include: { model: User, as: 'autor', attributes: ['id', 'nome', 'avatar'] }
        });
        res.status(200).json({ success: true, data: posts });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro de servidor ao buscar notícias.' });
    }
};

exports.getPostBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const post = await Post.findOne({
            where: { slug },
            include: { model: User, as: 'autor', attributes: ['id', 'nome', 'avatar'] }
        });
        if (!post) {
            return res.status(404).json({ success: false, error: 'Notícia não encontrada.' });
        }
        res.status(200).json({ success: true, data: post });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro de servidor ao buscar detalhes da notícia.' });
    }
};

exports.updatePost = async (req, res) => {
    const { id } = req.params;
    try {
        const post = await Post.findByPk(id);
        if (!post) {
            return res.status(404).json({ success: false, error: 'Notícia não encontrada para atualização.' });
        }
        
        const updateData = { ...req.body };
        if (updateData.titulo && updateData.titulo !== post.titulo) {
            updateData.slug = slugify(updateData.titulo);
        }
        updateData.emDestaque = updateData.emDestaque === 'on' || updateData.emDestaque === true;

        await post.update(updateData);
        res.status(200).json({ success: true, data: post });
    } catch (err) {
        res.status(400).json({ success: false, error: "Não foi possível atualizar a notícia." });
    }
};

exports.deletePost = async (req, res) => {
    const { id } = req.params;
    try {
        const deletedRows = await Post.destroy({ where: { id } });
        if (deletedRows === 0) {
            return res.status(404).json({ success: false, error: 'Notícia não encontrada.' });
        }
        res.status(200).json({ success: true, message: 'Notícia deletada com sucesso.' });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro de servidor ao deletar a notícia.' });
    }
};