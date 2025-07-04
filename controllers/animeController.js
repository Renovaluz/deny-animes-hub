// controllers/animeController.js

const db = require('../models');
const Anime = db.Anime;

/**
 * Converte um link de compartilhamento do Google Drive em um link de embed direto e funcional.
 * @param {string} url - O link original do Google Drive (ex: .../file/d/FILE_ID/view?usp=sharing)
 * @returns {string} - O link de embed para ser usado em um iframe (ex: .../file/d/FILE_ID/preview)
 */
function convertGoogleDriveLink(url) {
    if (!url || !url.includes('drive.google.com')) {
        return url; // Retorna a URL original se não for do Google Drive
    }
    try {
        const regex = /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
        const match = url.match(regex);
        if (match && match[1]) {
            const fileId = match[1];
            return `https://drive.google.com/file/d/${fileId}/preview`;
        }
        return url; // Retorna a URL original se o formato for inesperado
    } catch (e) {
        console.error("Erro ao converter link do Google Drive:", e);
        return url;
    }
}

exports.getAllAnimes = async (req, res) => {
    try {
        const animes = await Anime.findAll({ order: [['createdAt', 'DESC']] });
        res.status(200).json({ success: true, data: animes });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro de Servidor.' });
    }
};

exports.getAnimeById = async (req, res) => {
    try {
        const anime = await Anime.findByPk(req.params.id);
        if (!anime) return res.status(404).json({ success: false, error: 'Anime não encontrado.' });
        res.status(200).json({ success: true, data: anime });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro de Servidor.' });
    }
};

exports.createAnime = async (req, res) => {
    try {
        const { generos, ...animeData } = req.body;
        if (!animeData.id) delete animeData.id; // Garante que o ID é removido se for nulo/undefined
        const generosArray = generos ? generos.split(',').map(g => g.trim()) : [];
        const novoAnime = await Anime.create({ ...animeData, generos: generosArray });
        res.status(201).json({ success: true, data: novoAnime });
    } catch (err) {
        console.error("Erro ao criar anime:", err);
        res.status(400).json({ success: false, error: err.message || 'Erro ao processar requisição.' });
    }
};

exports.updateAnime = async (req, res) => {
    try {
        const anime = await Anime.findByPk(req.params.id);
        if (!anime) return res.status(404).json({ success: false, error: 'Anime não encontrado.' });
        
        const { generos, ...animeData } = req.body;
        const generosArray = generos ? generos.split(',').map(g => g.trim()) : [];
        
        await anime.update({ ...animeData, generos: generosArray });
        res.status(200).json({ success: true, data: anime });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

exports.deleteAnime = async (req, res) => {
    try {
        const anime = await Anime.findByPk(req.params.id);
        if (!anime) return res.status(404).json({ success: false, error: 'Anime não encontrado.' });
        await anime.destroy();
        res.status(200).json({ success: true, message: 'Anime deletado com sucesso.' });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro de Servidor.' });
    }
};

exports.addEpisode = async (req, res) => {
    try {
        const anime = await Anime.findByPk(req.params.id);
        if (!anime) return res.status(404).json({ success: false, error: 'Anime não encontrado.' });

        const episodiosAtuais = anime.episodios || [];
        if (episodiosAtuais.some(ep => ep.numero.toString() === req.body.numero.toString())) {
            return res.status(400).json({ success: false, error: `Episódio nº ${req.body.numero} já existe.` });
        }
        
        const novoEpisodio = req.body;
        if (novoEpisodio.tipoVideo === 'gdrive') {
            novoEpisodio.urlVideo = convertGoogleDriveLink(novoEpisodio.urlVideo);
        }
        
        const novosEpisodios = [...episodiosAtuais, novoEpisodio].sort((a, b) => Number(a.numero) - Number(b.numero));
        await anime.update({ episodios: novosEpisodios });
        
        res.status(201).json({ success: true, data: anime.get({ plain: true }) });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

exports.deleteEpisode = async (req, res) => {
    try {
        const anime = await Anime.findByPk(req.params.id);
        if (!anime) return res.status(404).json({ success: false, error: 'Anime não encontrado.' });

        const episodiosAtualizados = (anime.episodios || []).filter(ep => ep.numero.toString() !== req.params.epNum.toString());
        await anime.update({ episodios: episodiosAtualizados });
        res.status(200).json({ success: true, message: 'Episódio deletado.' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};