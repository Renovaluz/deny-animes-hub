'use strict';
const { Anime } = require('../models');
const slugify = require('../utils/slugify');

// Objeto que conterá todas as funções do controller
const animeController = {};

// GET all animes
animeController.getAllAnimes = async (req, res) => {
    try {
        const animes = await Anime.findAll({ order: [['createdAt', 'DESC']], include: 'episodios' });
        res.status(200).json({ success: true, data: animes });
    } catch (error) {
        console.error("Erro ao buscar animes:", error);
        res.status(500).json({ success: false, error: 'Erro de servidor ao buscar animes.' });
    }
};

// GET single anime by slug
animeController.getAnimeBySlug = async (req, res) => {
    try {
        const anime = await Anime.findOne({ where: { slug: req.params.slug }, include: 'episodios' });
        if (!anime) {
            return res.status(404).json({ success: false, error: 'Anime não encontrado.' });
        }
        res.status(200).json({ success: true, data: anime });
    } catch (error) {
        console.error("Erro ao buscar anime por slug:", error);
        res.status(500).json({ success: false, error: 'Erro ao buscar anime.' });
    }
};

// CREATE a new anime
animeController.createAnime = async (req, res) => {
    try {
        const { titulo, sinopse, anoLancamento, generos, imagemCapa, classificacao, estudio, trailerUrl } = req.body;
        
        if (!titulo || !sinopse || !anoLancamento || !generos) {
            return res.status(400).json({ success: false, error: 'Campos como título, sinopse, ano e gêneros são obrigatórios.' });
        }

        const slug = slugify(titulo);

        const novoAnime = await Anime.create({
            titulo,
            slug,
            sinopse,
            anoLancamento,
            generos,
            imagemCapa: imagemCapa || '/images/placeholder_poster.png',
            classificacao: classificacao || null,
            estudio: estudio || null,
            trailerUrl: trailerUrl || null
        });
        res.status(201).json({ success: true, data: novoAnime });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ success: false, error: 'Um anime com este título ou slug já existe.' });
        }
        console.error("Erro ao criar anime:", error);
        res.status(500).json({ success: false, error: 'Erro no servidor ao criar anime.' });
    }
};

// [CORREÇÃO DEFINITIVA] UPDATE an anime
animeController.updateAnime = async (req, res) => {
    try {
        // Usa o slug dos parâmetros da URL, que é mais confiável para identificar o recurso
        const slugParaAtualizar = req.params.slug;

        const { titulo, sinopse, anoLancamento, generos, imagemCapa, classificacao, estudio, trailerUrl } = req.body;
        
        const anime = await Anime.findOne({ where: { slug: slugParaAtualizar } });
        if (!anime) {
            return res.status(404).json({ success: false, error: 'Anime não encontrado para atualizar.' });
        }

        // Gera um novo slug SOMENTE se o título for alterado
        const novoSlug = titulo ? slugify(titulo) : anime.slug;

        // Atualiza a instância do anime com os novos dados
        await anime.update({
            titulo: titulo || anime.titulo,
            slug: novoSlug,
            sinopse: sinopse || anime.sinopse,
            anoLancamento: anoLancamento || anime.anoLancamento,
            generos: generos || anime.generos,
            imagemCapa: imagemCapa || anime.imagemCapa,
            classificacao: classificacao, // Permite null
            estudio: estudio,           // Permite null
            trailerUrl: trailerUrl        // Permite null
        });

        res.status(200).json({ success: true, data: anime });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ success: false, error: 'Um anime com este novo título ou slug já existe.' });
        }
        // Log do erro específico no console do servidor para depuração
        console.error("Erro detalhado ao atualizar anime:", error);
        res.status(500).json({ success: false, error: 'Erro no servidor ao atualizar anime.' });
    }
};

// DELETE an anime
animeController.deleteAnime = async (req, res) => {
    try {
        const anime = await Anime.findOne({ where: { slug: req.params.slug } });
        if (!anime) {
            return res.status(404).json({ success: false, error: 'Anime não encontrado.' });
        }
        await anime.destroy();
        res.status(200).json({ success: true, message: 'Anime deletado com sucesso.' });
    } catch (error) {
        console.error("Erro ao deletar anime:", error);
        res.status(500).json({ success: false, error: 'Erro ao deletar anime.' });
    }
};

module.exports = animeController;