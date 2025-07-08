// ==========================================================================
// DenyAnimeHub - Arquivo de Configuração e Roteamento Centralizado
// Versão: 12.2 (FINALÍSSIMA - Base do usuário com correção de upload)
//
// Este arquivo é o SEU código robusto, com a correção pontual e
// necessária para que TODAS as funções de upload e exibição de imagens
// funcionem perfeitamente, sem alterar nada que já estava correto.
// ==========================================================================

// --- 1. IMPORTAÇÕES ---
require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const fetch = require('node-fetch');
const db = require('./models');
const { proteger } = require('./middleware/authMiddleware');
const { admin } = require('./middleware/adminMiddleware');
// Importa o middleware de upload específico para cada tipo
const { uploadAvatar, uploadCapa, uploadImagemPost } = require('./middleware/uploadMiddleware'); // Assumindo que você usará a versão especialista do middleware

// Controllers
const authController = require('./controllers/authController');
const postApiController = require('./controllers/postController');
const userApiController = require('./controllers/userController');
const animeApiController = require('./controllers/animeController');

// --- 2. INICIALIZAÇÃO E CONFIGURAÇÃO DO EXPRESS ---
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- CONFIGURAÇÃO DE ARQUIVOS ESTÁTICOS (CORRETA E COMPLETA) ---
// Rota para arquivos estáticos GERAIS na pasta 'public' (CSS, JS, imagens do tema)
app.use(express.static(path.join(__dirname, 'public')));

// Rotas ESPECÍFICAS para servir os diferentes tipos de uploads.
// Isso garante que o navegador encontre as imagens nos caminhos corretos.
app.use('/uploads/images', express.static(path.join(__dirname, 'public/uploads/images')));
app.use('/uploads/avatars', express.static(path.join(__dirname, 'public/uploads/avatars')));
app.use('/uploads/capas', express.static(path.join(__dirname, 'public/uploads/capas')));

app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware global para views
app.use(async (req, res, next) => {
    res.locals.userIsLoggedIn = !!req.cookies.token;
    if (req.user) {
        res.locals.user = req.user.get({ plain: true });
    }
    next();
});

// --- 3. DEFINIÇÃO DE ROTAS ---

// =======================================
// SEÇÃO A: ROTAS PÚBLICAS E DE USUÁRIO
// =======================================

// Rota Principal (Página Inicial)
app.get('/', async (req, res) => {
    try {
        const animesDoBanco = await db.Anime.findAll({ order: [['createdAt', 'DESC']], limit: 24 });
        const todosAnimes = animesDoBanco.map(instance => instance.get({ plain: true }));
        res.render('index', { layout: false, page_name: 'index', titulo: 'Início', animes: todosAnimes });
    } catch (err) {
        console.error("Erro na rota /:", err);
        res.status(500).render('500', { layout: false, error: err });
    }
});

// Rota da Página de Login/Registro
app.get('/login', (req, res) => {
    res.render('login', { layout: false, page_name: 'login-page', titulo: 'Login/Registro', erro: req.query.erro, sucesso: req.query.sucesso });
});

// Rota da Página de Notícias
app.get('/noticias', async (req, res) => {
    try {
        const internalNewsPromise = Promise.all([
            db.Post.findOne({ where: { emDestaque: true }, include: 'autor' }),
            db.Post.findAll({ where: { emDestaque: false }, order: [['createdAt', 'DESC']], limit: 10, include: 'autor' })
        ]);
        const topAnimesPromise = fetch('https://api.jikan.moe/v4/top/anime?filter=airing&limit=5').then(response => response.json());
        
        const [[noticiaDestaque, noticiasRecentes], jikanData] = await Promise.all([internalNewsPromise, topAnimesPromise]);

        res.render('noticias', {
            layout: false, page_name: 'noticias', titulo: 'Notícias',
            destaque: noticiaDestaque, recentes: noticiasRecentes,
            topAnimes: jikanData.data || []
        });
    } catch (err) {
        console.error('Erro na rota /noticias:', err);
        try {
            const noticiaDestaque = await db.Post.findOne({ where: { emDestaque: true }, include: 'autor' });
            const noticiasRecentes = await db.Post.findAll({ where: { emDestaque: false }, order: [['createdAt', 'DESC']], limit: 10, include: 'autor' });
            res.render('noticias', { layout: false, page_name: 'noticias', titulo: 'Notícias', destaque: noticiaDestaque, recentes: noticiasRecentes, topAnimes: [] });
        } catch (internalErr) {
            res.status(500).render('500', { layout: false, error: internalErr });
        }
    }
});


// Rota de Detalhes do Anime por ID
app.get('/anime/:id', async (req, res) => {
    try {
        const animeId = req.params.id;
        if (isNaN(animeId)) return res.status(400).render('404', { layout: false, titulo: 'ID de Anime Inválido' });
        const anime = await db.Anime.findByPk(animeId);
        if (!anime) return res.status(404).render('404', { layout: false, titulo: 'Anime não encontrado' });
        await anime.increment('views');
        res.render('detalhe-anime', { layout: false, page_name: 'anime-detail', titulo: anime.titulo, anime: anime.get({ plain: true }) });
    } catch (err) {
        console.error(`Erro ao buscar anime com ID ${req.params.id}:`, err);
        res.status(500).render('500', { layout: false, error: err });
    }
});

// Rota para a página de exploração
app.get('/explorar', (req, res) => {
    res.render('explorar', { layout: false, page_name: 'explorar', titulo: 'Explorar Animes' });
});

// Rota para a página de perfil do usuário (protegida)
app.get('/perfil', proteger, (req, res) => {
    res.render('perfil', {
        layout: false,
        page_name: 'perfil',
        titulo: 'Meu Perfil',
        user: req.user.get({ plain: true })
    });
});

// Rota para a página de edição de perfil (protegida)
app.get('/perfil/editar', proteger, (req, res) => {
    res.render('editar-perfil', {
        layout: false,
        page_name: 'editar-perfil',
        titulo: 'Editar Perfil',
        user: req.user.get({ plain: true })
    });
});

// Rota de Assistir
app.get('/assistir/:animeId/:epNum', proteger, async (req, res) => {
    try {
        const { animeId, epNum } = req.params;
        const anime = await db.Anime.findByPk(animeId);
        if (!anime) return res.status(404).render('404', { layout: false, titulo: 'Anime não encontrado' });
        const episodiosArray = anime.episodios || [];
        const episodio = episodiosArray.find(ep => ep.numero.toString() === epNum);
        if (!episodio) return res.status(404).render('404', { layout: false, titulo: 'Episódio não encontrado' });
        const todosEpisodios = episodiosArray.sort((a, b) => a.numero - b.numero);
        const animesSugeridos = await db.Anime.findAll({ limit: 12, order: db.sequelize.random() });
        res.render('player', {
            layout: false, page_name: 'player', titulo: `Assistindo: ${anime.titulo}`,
            anime: anime.get({ plain: true }), episodio, todosEpisodios,
            sugestoes: animesSugeridos
        });
    } catch (err) {
        console.error("Erro na rota /assistir:", err);
        res.status(500).render('500', { layout: false, error: err });
    }
});

// ROTAS DE AÇÕES DE AUTENTICAÇÃO
app.post('/auth/registrar', authController.registrar);
app.post('/auth/login', authController.login);
app.get('/auth/logout', authController.logout);

// =======================================
// SEÇÃO B: PAINEL DE ADMINISTRAÇÃO E API INTERNA
// =======================================

// Rota para renderizar a página do painel de admin "tudo-em-um"
app.get('/admin/dashboard', proteger, admin, async (req, res) => {
    try {
        const [totalAnimes, totalPosts, totalUsers] = await Promise.all([db.Anime.count(), db.Post.count(), db.User.count()]);
        res.render('admin/dashboard', {
            layout: false,
            title: 'Admin Dashboard',
            totalAnimes,
            totalPosts,
            totalUsers,
            user: req.user.get({ plain: true })
        });
    } catch (err) {
        console.error("Erro ao carregar dashboard do admin:", err);
        res.status(500).render('500', { layout: false, error: err });
    }
});

// Roteador central para todas as chamadas de API
const apiRouter = express.Router();
apiRouter.use(proteger);

// APIs exclusivas para Admin
apiRouter.post('/upload/image', admin, uploadImagemPost.single('imagem'), (req, res) => {
    if (req.file) {
        // CORRIGIDO: Retorna o caminho completo para a pasta correta
        res.json({ success: true, filePath: `/uploads/images/${req.file.filename}` });
    } else {
        res.status(400).json({ success: false, error: 'Falha no upload. Nenhum arquivo recebido.' });
    }
});

apiRouter.get('/posts', admin, postApiController.getAllPosts);
apiRouter.post('/posts', admin, postApiController.createPost);
apiRouter.get('/posts/:id', admin, postApiController.getPostById);
apiRouter.put('/posts/:id', admin, postApiController.updatePost);
apiRouter.delete('/posts/:id', admin, postApiController.deletePost);

apiRouter.get('/animes', admin, animeApiController.getAllAnimes);
apiRouter.post('/animes', admin, animeApiController.createAnime);
apiRouter.get('/animes/:id', admin, animeApiController.getAnimeById);
apiRouter.put('/animes/:id', admin, animeApiController.updateAnime);
apiRouter.delete('/animes/:id', admin, animeApiController.deleteAnime);

apiRouter.post('/animes/:id/episodes', admin, animeApiController.addEpisode);
apiRouter.delete('/animes/:id/episodes/:epNum', admin, animeApiController.deleteEpisode);

apiRouter.get('/users', admin, userApiController.getAllUsers);
apiRouter.put('/users/:id', admin, userApiController.updateUserByAdmin);
apiRouter.delete('/users/:id', admin, userApiController.deleteUserByAdmin);

// APIs para o usuário logado editar seu próprio perfil
apiRouter.put('/user/profile', userApiController.updateUserProfile);
apiRouter.post('/user/profile/avatar', uploadAvatar.single('avatar'), userApiController.updateUserAvatar);
apiRouter.post('/user/profile/capa', uploadCapa.single('capa'), userApiController.updateUserCapa);

// Registra o roteador da API no caminho principal /api
app.use('/api', apiRouter);

// =======================================
// ROTA DE ERRO 404 e 500 (Fallback)
// =======================================
app.use((req, res, next) => {
    res.status(404).render('404', { layout: false, titulo: 'Página Não Encontrada' });
});

app.use((err, req, res, next) => {
    console.error("ERRO INESPERADO:", err.stack);
    res.status(500).render('500', { layout: false, titulo: 'Erro no Servidor', error: err });
});

// --- 4. EXPORTAÇÃO ---
module.exports = app;