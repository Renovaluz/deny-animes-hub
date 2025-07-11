// ====================================================================================
//              DenyAnimeHub - Controller: Animes (Versão Final com Slugs)
// ====================================================================================

'use strict';
const { Anime, Episodio, sequelize } = require('../models');
const slugify = require('../utils/slugify');

exports.createAnime = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { titulo, sinopse, anoLancamento, generos, classificacao, imagemCapa } = req.body;

        if (!titulo || !sinopse || !anoLancamento || !generos) {
             await transaction.rollback();
             return res.status(400).json({ success: false, error: 'Campos como título, sinopse, ano e gêneros são obrigatórios.' });
        }

        const slug = slugify(titulo);

        const novoAnime = await Anime.create({
            titulo,
            slug,
            sinopse,
            anoLancamento,
            generos,
            classificacao: classificacao || null,
            imagemCapa: imagemCapa || '/images/placeholder_poster.png'
        }, { transaction });
        
        await transaction.commit();
        res.status(201).json({ success: true, data: novoAnime });
    } catch (error) {
        await transaction.rollback();
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ success: false, error: 'Um anime com este título (e slug) já existe.' });
        }
        console.error("Erro ao criar anime:", error);
        res.status(500).json({ success: false, error: 'Erro interno ao criar o anime.' });
    }
};

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
        res.status(500).json({ success: false, error: 'Erro de servidor ao buscar detalhes do anime.' });
    }
};

exports.updateAnime = async (req, res) => {
    const { slug } = req.params;
    const transaction = await sequelize.transaction();
    try {
        const anime = await Anime.findOne({ where: { slug }, transaction });
        if (!anime) {
            await transaction.rollback();
            return res.status(404).json({ success: false, error: 'Anime não encontrado.' });
        }
        
        const updateData = { ...req.body };
        if (updateData.titulo && updateData.titulo !== anime.titulo) {
            updateData.slug = slugify(updateData.titulo);
        }

        await anime.update(updateData, { transaction });
        await transaction.commit();
        res.status(200).json({ success: true, data: anime });
    } catch (error) {
        await transaction.rollback();
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ success: false, error: 'Um anime com o novo título já existe.' });
        }
        res.status(500).json({ success: false, error: 'Erro ao atualizar o anime.' });
    }
};

exports.deleteAnime = async (req, res) => {
    const { slug } = req.params;
    try {
        const deletedRows = await Anime.destroy({ where: { slug } });
        if (deletedRows === 0) return res.status(404).json({ success: false, error: 'Anime não encontrado.' });
        res.status(200).json({ success: true, message: 'Anime deletado com sucesso.' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Erro de servidor ao deletar o anime.' });
    }
};