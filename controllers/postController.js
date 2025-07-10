// ====================================================================================
//
//              DenyAnimeHub - Controller: Posts (Notícias com Lógica de Slugs)
//
// Versão:        3.2 (Final e Completa)
// Descrição:     Controller robusto para gerenciar notícias. Inclui todas as funções
//                de CRUD (Create, Read, Update, Delete), implementa a geração e busca
//                por slugs para URLs amigáveis e garante validação de dados para
//                manter a integridade do banco de dados.
//
// ====================================================================================

'use strict';
const { Post, User, sequelize } = require('../models');
const slugify = require('../utils/slugify'); // Reutilizando nosso gerador de slug

// Objeto para agrupar todas as funções do controller
const postController = {};

/**
 * @desc    Admin: Cria uma nova notícia.
 * @route   POST /api/posts
 */
postController.createPost = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { titulo, conteudo, imagemDestaque, categoria, tags, emDestaque } = req.body;
        
        // Validação de entrada rigorosa
        if (!titulo || !conteudo) {
            await transaction.rollback();
            return res.status(400).json({ success: false, error: 'Título e conteúdo são obrigatórios para criar uma notícia.' });
        }

        // Gera um slug único a partir do título
        const slug = slugify(titulo);

        // Prepara o objeto de dados para criação
        const postData = {
            titulo,
            slug,
            conteudo,
            imagemDestaque,
            categoria,
            tags,
            emDestaque: emDestaque === 'on' || emDestaque === true, // Converte checkbox para booleano
            autorId: req.user.id, // O ID do autor vem do middleware 'proteger'
            autorNome: req.user.nome // Armazena o nome para referência
        };

        const novoPost = await Post.create(postData, { transaction });
        await transaction.commit();

        console.log(`[Post Controller] Notícia criada com sucesso: ID ${novoPost.id} - "${novoPost.titulo}"`);
        res.status(201).json({ success: true, data: novoPost });

    } catch (error) {
        await transaction.rollback();
        
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ success: false, error: 'Uma notícia com este título já existe.' });
        }
        if (error.name === 'SequelizeValidationError') {
            const errors = error.errors.map(e => e.message).join(', ');
            return res.status(400).json({ success: false, error: `Erro de validação: ${errors}` });
        }
        
        console.error("Erro ao criar post:", error);
        res.status(500).json({ success: false, error: 'Ocorreu um erro inesperado no servidor ao criar a notícia.' });
    }
};

/**
 * @desc    Admin: Busca TODAS as notícias para o painel de administração.
 * @route   GET /api/posts
 */
postController.getAllPosts = async (req, res) => {
    try {
        const posts = await Post.findAll({
            order: [['createdAt', 'DESC']],
            include: { 
                model: User, 
                as: 'autor', 
                attributes: ['id', 'nome', 'avatar'] // Inclui dados básicos do autor
            }
        });
        res.status(200).json({ success: true, data: posts });
    } catch (err) {
        console.error("Erro em getAllPosts:", err);
        res.status(500).json({ success: false, error: 'Erro de servidor ao buscar notícias.' });
    }
};

/**
 * @desc    Admin: Busca uma notícia específica pelo seu SLUG para edição.
 * @route   GET /api/posts/:slug
 */
postController.getPostBySlug = async (req, res) => {
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
        console.error("Erro em getPostBySlug:", err);
        res.status(500).json({ success: false, error: 'Erro de servidor ao buscar detalhes da notícia.' });
    }
};

/**
 * @desc    Admin: Atualiza uma notícia (usando ID como referência interna).
 * @route   PUT /api/posts/:id
 */
postController.updatePost = async (req, res) => {
    const { id } = req.params;
    try {
        const post = await Post.findByPk(id);
        if (!post) {
            return res.status(404).json({ success: false, error: 'Notícia não encontrada para atualização.' });
        }
        
        const updateData = { ...req.body };
        // Se o título for alterado, gera um novo slug para manter a consistência
        if (updateData.titulo && updateData.titulo !== post.titulo) {
            updateData.slug = slugify(updateData.titulo);
        }
        // Converte o valor do checkbox
        updateData.emDestaque = updateData.emDestaque === 'on' || updateData.emDestaque === true;

        await post.update(updateData);
        
        console.log(`[Post Controller] Notícia atualizada com sucesso: ID ${id}`);
        res.status(200).json({ success: true, data: post });
    } catch (err) {
        console.error(`Erro ao atualizar post ID ${id}:`, err);
        res.status(400).json({ success: false, error: err.message || "Não foi possível atualizar a notícia." });
    }
};

/**
 * @desc    Admin: Deleta uma notícia (usando ID como referência interna).
 * @route   DELETE /api/posts/:id
 */
postController.deletePost = async (req, res) => {
    const { id } = req.params;
    try {
        const deletedRows = await Post.destroy({ where: { id } });
        if (deletedRows === 0) {
            return res.status(404).json({ success: false, error: 'Notícia não encontrada.' });
        }
        
        console.log(`[Post Controller] Notícia deletada com sucesso: ID ${id}`);
        res.status(200).json({ success: true, message: 'Notícia deletada com sucesso.' });
    } catch (err) {
        console.error(`Erro ao deletar post ID ${id}:`, err);
        res.status(500).json({ success: false, error: 'Erro de servidor ao deletar a notícia.' });
    }
};

module.exports = postController;