// ====================================================================================
//
//              DenyAnimeHub - Controller: Animes (Versão Final com Slugs)
//
// ====================================================================================

'use strict';
const { Anime, Episodio, sequelize } = require('../models');
const slugify = require('../utils/slugify'); // Garanta que você tem o arquivo utils/slugify.js

/**
 * @desc    Cria um novo anime, incluindo a geração de um slug único.
 * @route   POST /api/animes
 */
exports.createAnime = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { titulo, sinopse, anoLancamento, generos, classificacao, imagemCapa } = req.body;

        if (!titulo || !sinopse || !anoLancamento || !generos || !imagemCapa) {
             await transaction.rollback();
             return res.status(400).json({ success: false, error: 'Todos os campos, incluindo a capa, são obrigatórios.' });
        }

        // **CORREÇÃO CRUCIAL: Geração do slug a partir do título**
        const slug = slugify(titulo);

        const novoAnime = await Anime.create({
            titulo,
            slug, // Salva o slug no banco de dados
            sinopse,
            anoLancamento,
            generos,
            classificacao: classificacao || null,
            imagemCapa
        }, { transaction });
        
        await transaction.commit();
        res.status(201).json({ success: true, data: novoAnime });
    } catch (error) {
        await transaction.rollback();
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ success: false, error: 'Um anime com este título já existe.' });
        }
        console.error("Erro ao criar anime:", error);
        res.status(500).json({ success: false, error: 'Erro interno ao criar anime.' });
    }
};

/**
 * @desc    Busca todos os animes.
 * @route   GET /api/animes
 */
exports.getAllAnimes = async (req, res) => {
    try {
        const animes = await Anime.findAll({
            include: [{ model: Episodio, as: 'episodios', attributes: ['id'] }],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json({ success: true, data: animes });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Erro de servidor ao listar animes.' });
    }
};

/**
 * @desc    Busca um anime pelo seu slug.
 * @route   GET /api/animes/:slug
 */
exports.getAnimeBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const anime = await Anime.findOne({
            where: { slug },
            include: [{ model: Episodio, as: 'episodios', order: [['temporada', 'ASC'], ['numero', 'ASC']] }]
        });
        if (!anime) return res.status(404).json({ success: false, error: 'Anime não encontrado.' });
        res.status(200).json({ success: true, data: anime });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Erro de servidor ao buscar detalhes.' });
    }
};

/**
 * @desc    Atualiza um anime pelo seu slug.
 * @route   PUT /api/animes/:slug
 */
exports.updateAnime = async (req, res) => {
    const { slug } = req.params;
    try {
        const anime = await Anime.findOne({ where: { slug } });
        if (!anime) return res.status(404).json({ success: false, error: 'Anime não encontrado.' });
        
        // Se o título for alterado, gera um novo slug
        if (req.body.titulo && req.body.titulo !== anime.titulo) {
            req.body.slug = slugify(req.body.titulo);
        }

        await anime.update(req.body);
        res.status(200).json({ success: true, data: anime });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Erro ao atualizar o anime.' });
    }
};

/**
 * @desc    Deleta um anime pelo seu slug.
 * @route   DELETE /api/animes/:slug
 */
exports.deleteAnime = async (req, res) => {
    const { slug } = req.params;
    try {
        const deletedRows = await Anime.destroy({ where: { slug } });
        if (deletedRows === 0) return res.status(404).json({ success: false, error: 'Anime não encontrado.' });
        res.status(200).json({ success: true, message: 'Anime deletado com sucesso.' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Erro de servidor ao deletar.' });
    }
};