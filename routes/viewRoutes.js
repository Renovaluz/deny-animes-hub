const express = require('express');
const router = express.Router();
const { proteger } = require('../middleware/authMiddleware');
const Anime = require('../models/Anime');
const Post = require('../models/Post');

// Rota para a página inicial
router.get('/', async (req, res) => {
    try {
        const todosAnimes = await Anime.find().sort({ titulo: 1 }); // Ordena por título
        res.render('index', {
            page_name: 'index',
            titulo: 'Início',
            animes: todosAnimes
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao buscar dados para a página inicial.");
    }
});

// Rota para a página de login/registro
router.get('/login', (req, res) => {
    res.render('login', {
        page_name: 'login-page',
        titulo: 'Login/Registro',
        erro: null,
        sucesso: req.query.sucesso
    });
});

// Rota para a página de notícias
router.get('/noticias', async (req, res) => {
    try {
        const noticiaDestaque = await Post.findOne({ emDestaque: true }).populate('autor', 'nome');
        const noticiasRecentes = await Post.find({ emDestaque: false }).sort({ dataCriacao: -1 }).limit(10).populate('autor', 'nome');
        const noticiasQuentes = await Post.find().sort({ views: -1 }).limit(5); // Para a sidebar

        res.render('noticias', {
            page_name: 'noticias',
            titulo: 'Notícias',
            destaque: noticiaDestaque,
            recentes: noticiasRecentes,
            quentes: noticiasQuentes
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao buscar notícias.");
    }
});

// Rota para a página de DETALHES de um anime
router.get('/anime/:id', async (req, res) => {
    try {
        const anime = await Anime.findById(req.params.id);
        if (!anime) {
            return res.status(404).send('Anime não encontrado');
        }
        res.render('detalhe-anime', {
            page_name: 'anime-detail',
            titulo: anime.titulo,
            anime: anime
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao buscar detalhes do anime.");
    }
});


// Rota para a página de ASSISTIR um anime
router.get('/assistir/:id', async (req, res) => {
    try {
        const anime = await Anime.findById(req.params.id);
        if (!anime || anime.episodios.length === 0) {
            return res.status(404).send('Anime ou episódios não encontrados');
        }
        
        // Sugestões: animes do mesmo gênero, exceto o atual
        const sugestoes = await Anime.find({ 
            generos: { $in: anime.generos },
            _id: { $ne: anime._id } 
        }).limit(10);

        res.render('assistir', {
            page_name: 'assistir',
            titulo: `Assistir ${anime.titulo}`,
            anime: anime,
            sugestoes: sugestoes,
            // Passa o primeiro episódio como padrão, ou o que vier na query ?ep=...
            episodioAtual: anime.episodios[0] 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao carregar página para assistir.");
    }
});


// Rota para a página de perfil (protegida)
router.get('/perfil', proteger, (req, res) => {
    res.render('perfil', {
        page_name: 'perfil',
        titulo: 'Meu Perfil',
        user: req.user
    });
});

module.exports = router;