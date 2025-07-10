// ====================================================================================
//
//              DenyAnimeHub - Ponto de Entrada Principal da Aplicação
//
// Versão:        19.2 (Susano'o Perfeito - Correção Final de Controller)
// Descrição:     Versão final que corrige o erro 'Route.get() requires a callback'
//                alinhando todas as rotas da API com seus respectivos controllers,
//                incluindo a busca de posts por slug. A estrutura original foi
//                100% preservada.
//
// ====================================================================================

// --- MÓDULO 1: IMPORTAÇÕES E CONFIGURAÇÃO DE AMBIENTE ---
require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken'); // Importa o JWT para decodificar o token

// Importa a conexão e todos os modelos do banco de dados
const db = require('./models');

// Middlewares de autenticação, autorização e upload
const { proteger, admin, protegerOpcional } = require('./middleware/authMiddleware');
const { uploadAvatar, uploadCapa, uploadImagemPost, uploadVideo } = require('./middleware/uploadMiddleware');

// Controllers para a lógica de cada rota
const authController = require('./controllers/authController');
const postApiController = require('./controllers/postController');
const userApiController = require('./controllers/userController');
const animeApiController = require('./controllers/animeController');
const episodioApiController = require('./controllers/episodioController');


// --- MÓDULO 2: INICIALIZAÇÃO E CONFIGURAÇÃO DO EXPRESS ---
const app = express();
const PORT = process.env.PORT || 3000;

// Configuração dos parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Configuração do Template Engine (EJS)
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configuração de arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));


// --- MÓDULO 3: MIDDLEWARE GLOBAL PARA AS VIEWS ---
// Este middleware customizado tenta encontrar o usuário logado e o anexa a res.locals.
app.use(protegerOpcional);
app.use((req, res, next) => {
    res.locals.user = req.user ? req.user.get({ plain: true }) : null;
    res.locals.userIsLoggedIn = !!req.user;
    next();
});

// --- MÓDULO 4: DEFINIÇÃO DE ROTAS DE VISUALIZAÇÃO ---

// Rota Principal (Página Inicial)
app.get('/', async (req, res) => {
    try {
        const animesDoBanco = await db.Anime.findAll({ order: [['createdAt', 'DESC']], limit: 24 });
        res.render('index', { layout: false, page_name: 'index', titulo: 'Início', animes: animesDoBanco });
    } catch (err) {
        res.status(500).render('500', { layout: false, titulo: 'Erro no Servidor', error: err });
    }
});

// Rota da Página de Login/Registro
app.get('/login', (req, res) => {
    if (res.locals.userIsLoggedIn) return res.redirect('/');
    res.render('login', { layout: false, page_name: 'login-page', titulo: 'Login/Registro', erro: req.query.erro, sucesso: req.query.sucesso, redirect: req.query.redirect || '/' });
});

// Rota da Página de Notícias
app.get('/noticias', async (req, res) => {
    try {
        const [noticiaDestaque, noticiasRecentes] = await Promise.all([
            db.Post.findOne({ where: { emDestaque: true }, include: 'autor', order: [['createdAt', 'DESC']] }),
            db.Post.findAll({ where: { emDestaque: [false, null] }, order: [['createdAt', 'DESC']], limit: 10, include: 'autor' })
        ]);
        res.render('noticias', {
            layout: false, page_name: 'noticias', titulo: 'Notícias',
            destaque: noticiaDestaque, recentes: noticiasRecentes,
        });
    } catch (err) {
        res.status(500).render('500', { layout: false, titulo: 'Erro no Servidor', error: 'Falha ao carregar notícias.' });
    }
});

// Rota de Detalhes da Notícia por Slug
app.get('/noticias/:slug', async (req, res) => {
    try {
        const post = await db.Post.findOne({ where: { slug: req.params.slug }, include: 'autor' });
        if (!post) return res.status(404).render('404', { layout: false, titulo: 'Notícia não encontrada' });
        await post.increment('views');
        res.render('detalhe-post', { layout: false, page_name: 'detalhe-post', titulo: post.titulo, post });
    } catch (err) {
        res.status(500).render('500', { layout: false, titulo: 'Erro no Servidor', error: 'Falha ao carregar a notícia.' });
    }
});

// Rota de Assistir (usando slug)
app.get('/assistir/:slug/:epId', proteger, async (req, res) => {
    try {
        const anime = await db.Anime.findOne({ where: { slug: req.params.slug }, include: [{ model: db.Episodio, as: 'episodios', order: [['temporada', 'ASC'], ['numero', 'ASC']] }] });
        if (!anime) return res.status(404).render('404', { layout: false, titulo: 'Anime não encontrado' });
        const episodioAtual = anime.episodios.find(ep => ep.id.toString() === req.params.epId);
        if (!episodioAtual) return res.status(404).render('404', { layout: false, titulo: 'Episódio não encontrado' });
        res.render('assistir', {
            layout: false,
            initialAnime: anime.get({ plain: true }),
            initialEpisode: episodioAtual.get({ plain: true }),
            titulo: `Assistindo: ${anime.titulo} - Ep ${episodioAtual.numero}`
        });
    } catch (err) {
        res.status(500).render('500', { layout: false, titulo: 'Erro no Servidor', error: err });
    }
});

// Rota de Detalhes do Anime por Slug
app.get('/anime/:slug', async (req, res) => {
    try {
        const anime = await db.Anime.findOne({ where: { slug: req.params.slug }, include: [{ model: db.Episodio, as: 'episodios', order: [['temporada', 'ASC'], ['numero', 'ASC']] }] });
        if (!anime) return res.status(404).render('404', { layout: false, titulo: 'Anime não encontrado' });
        await anime.increment('views');
        res.render('detalhe-anime', { layout: false, page_name: 'anime-detail', titulo: anime.titulo, anime: anime.get({ plain: true }) });
    } catch (err) {
        res.status(500).render('500', { layout: false, titulo: 'Erro no Servidor', error: err });
    }
});

// Outras rotas de página
app.get('/explorar', (req, res) => { res.render('explorar', { layout: false, page_name: 'explorar', titulo: 'Explorar Animes' }); });
app.get('/perfil', proteger, (req, res) => { res.render('perfil', { layout: false, page_name: 'perfil', titulo: 'Meu Perfil' }); });
app.get('/perfil/editar', proteger, (req, res) => { res.render('perfil/editar', { layout: false, page_name: 'editar-perfil', titulo: 'Editar Perfil' }); });

// Rota do painel de administração
app.get('/admin/dashboard', proteger, admin, async (req, res) => {
    try {
        const [totalAnimes, totalPosts, totalUsers] = await Promise.all([db.Anime.count(), db.Post.count(), db.User.count()]);
        res.render('admin/dashboard', { layout: false, title: 'Painel de Administração', totalAnimes, totalPosts, totalUsers });
    } catch (err) {
        res.status(500).render('500', { layout: false, titulo: 'Erro no Servidor', error: err });
    }
});

// --- MÓDULO 5: ROTAS DE AÇÕES E API ---

// ROTAS DE AÇÕES DE AUTENTICAÇÃO
app.post('/auth/registrar', authController.registrar);
app.post('/auth/login', authController.login);
app.get('/auth/logout', authController.logout);

// Roteador central para todas as chamadas de API
const apiRouter = express.Router();
apiRouter.use(proteger);

// --- ROTAS DE UPLOAD ---
apiRouter.post('/upload/capa', admin, uploadCapa.single('file'), (req, res) => { if (!req.file) return res.status(400).json({ success: false, error: 'Nenhum arquivo de capa recebido.' }); res.json({ success: true, filePath: `/uploads/capas/${req.file.filename}` }); });
apiRouter.post('/upload/video', admin, uploadVideo.single('file'), (req, res) => { if (!req.file) return res.status(400).json({ success: false, error: 'Nenhum arquivo de vídeo recebido.' }); res.json({ success: true, filePath: `/uploads/videos/${req.file.filename}` }); });
apiRouter.post('/upload/image', admin, uploadImagemPost.single('imagem'), (req, res) => { if (!req.file) return res.status(400).json({ success: false, error: 'Nenhum arquivo de imagem recebido.' }); res.json({ success: true, filePath: `/uploads/images/${req.file.filename}` }); });
apiRouter.post('/user/profile/avatar', uploadAvatar.single('avatar'), userApiController.updateUserAvatar);
apiRouter.post('/user/profile/capa', uploadCapa.single('capa'), userApiController.updateUserCapa);

// --- ROTAS DE CRUD ---
apiRouter.get('/posts', admin, postApiController.getAllPosts);
apiRouter.post('/posts', admin, postApiController.createPost);
// **AQUI ESTÁ A CORREÇÃO FINAL**
// A rota da API para buscar um post por slug agora chama a função correta.
apiRouter.get('/posts/:slug', admin, postApiController.getPostBySlug);
apiRouter.put('/posts/:id', admin, postApiController.updatePost);
apiRouter.delete('/posts/:id', admin, postApiController.deletePost);

apiRouter.get('/animes', admin, animeApiController.getAllAnimes);
apiRouter.post('/animes', admin, animeApiController.createAnime);
apiRouter.get('/animes/:slug', admin, animeApiController.getAnimeBySlug);
apiRouter.put('/animes/:slug', admin, animeApiController.updateAnime);
apiRouter.delete('/animes/:slug', admin, animeApiController.deleteAnime);

apiRouter.post('/episodios', admin, episodioApiController.createEpisodio);
apiRouter.delete('/episodios/:id', admin, episodioApiController.deleteEpisodio);

apiRouter.get('/users', admin, userApiController.getAllUsers);
apiRouter.put('/users/:id', admin, userApiController.updateUserByAdmin);
apiRouter.delete('/users/:id', admin, userApiController.deleteUserByAdmin);

apiRouter.put('/user/profile', userApiController.updateUserProfile);

// Registra o roteador da API no caminho principal /api
app.use('/api', apiRouter);

// --- MÓDULO 6: TRATAMENTO DE ERROS E INICIALIZAÇÃO ---
app.use((req, res, next) => { res.status(404).render('404', { layout: false, titulo: 'Página Não Encontrada' }); });
app.use((err, req, res, next) => { console.error("ERRO INESPERADO:", err.stack); res.status(500).render('500', { layout: false, titulo: 'Erro no Servidor', error: err }); });

db.sequelize.sync({ alter: process.env.NODE_ENV === 'development' })
  .then(() => {
    console.log('✅ Banco de dados sincronizado e pronto.');
    app.listen(PORT, () => {
      console.log(`🚀 Servidor Akatsuki no ar: http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ FALHA CRÍTICA AO INICIAR O SERVIDOR:', err);
    process.exit(1);
  });