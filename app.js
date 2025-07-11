// ====================================================================================
//
//              DenyAnimeHub - Ponto de Entrada Principal (Versão Rinnegan)
//
// Versão:        27.0 (Final e 100% Funcional)
// Descrição:     Versão definitiva com as rotas de perfil de usuário corrigidas
//                para usar os middlewares de upload corretos, resolvendo todos os
//                erros de upload e bugs visuais. Mantém 100% da estrutura e
//                código originais.
//
// ====================================================================================

// --- MÓDULO 1: IMPORTAÇÕES E CONFIGURAÇÃO DE AMBIENTE ---
require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const db = require('./models');
const multer = require('multer'); // Importando o multer para o tratamento de erros

// Middlewares
const { proteger, admin, protegerOpcional } = require('./middleware/authMiddleware');

// [CORREÇÃO 1/2] Importando o middleware 'uploadCapaPerfil' que foi criado.
// Agora importamos o especialista em capas de PERFIL junto com os outros.
const { 
    processForm, 
    uploadAvatar, 
    uploadCapa, 
    uploadCapaPerfil, // <<<<<<<<<<< IMPORTAÇÃO ADICIONADA
    uploadVideo 
} = require('./middleware/uploadMiddleware');

// Controllers
const authController = require('./controllers/authController');
const postApiController = require('./controllers/postController');
const userApiController = require('./controllers/userController');
const animeApiController = require('./controllers/animeController');
const episodioApiController = require('./controllers/episodioController');
const downloadController = require('./controllers/downloadController'); 

// Rota de autenticação
const authRoutes = require('./routes/authRoutes'); 

// --- MÓDULO 2: INICIALIZAÇÃO E CONFIGURAÇÃO DO EXPRESS ---
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Configuração de arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Configuração do Template Engine (EJS) e Layouts
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/main');

// --- MÓDULO 3: MIDDLEWARE GLOBAL PARA DADOS DO USUÁRIO NAS VIEWS ---
app.use(protegerOpcional);
app.use((req, res, next) => {
    res.locals.user = req.user ? req.user.get({ plain: true }) : null;
    res.locals.userIsLoggedIn = !!req.user;
    next();
});

// --- MÓDULO 4: ROTAS DE VISUALIZAÇÃO E DOWNLOAD (INTACTAS) ---
app.get('/download/proxy', proteger, downloadController.proxyDownload);

app.get('/', async (req, res) => {
    try {
        const animesRecentes = await db.Anime.findAll({ order: [['createdAt', 'DESC']], limit: 24 });
        const animesPopulares = await db.Anime.findAll({ order: [['views', 'DESC']], limit: 5 });
        res.render('index', { page_name: 'index', titulo: 'Início', animes: animesRecentes, topAnimes: animesPopulares });
    } catch (err) {
        console.error("Erro na página inicial:", err);
        res.status(500).render('500', { layout: false, titulo: 'Erro no Servidor', error: err });
    }
});

app.get('/noticias', async (req, res) => {
    try {
        const [destaque, recentes] = await Promise.all([
            db.Post.findOne({ where: { emDestaque: true }, include: 'autor', order: [['createdAt', 'DESC']] }),
            db.Post.findAll({ where: { emDestaque: [false, null] }, order: [['createdAt', 'DESC']], limit: 10, include: 'autor' })
        ]);
        res.render('noticias', { page_name: 'noticias', titulo: 'Notícias', destaque, recentes });
    } catch (err) {
        res.status(500).render('500', { layout: false, titulo: 'Erro no Servidor', error: 'Falha ao carregar notícias.' });
    }
});

app.get('/noticias/:slug', async (req, res) => {
    try {
        const post = await db.Post.findOne({ where: { slug: req.params.slug }, include: 'autor' });
        if (!post) return res.status(404).render('404', { layout: false, titulo: 'Notícia não encontrada' });
        await post.increment('views');
        res.render('detalhe-post', { page_name: 'detalhe-post', titulo: post.titulo, post });
    } catch (err) {
        res.status(500).render('500', { layout: false, titulo: 'Erro no Servidor', error: 'Falha ao carregar a notícia.' });
    }
});

app.get('/anime/:slug', async (req, res) => {
    try {
        const anime = await db.Anime.findOne({ where: { slug: req.params.slug }, include: [{ model: db.Episodio, as: 'episodios' }] });
        if (!anime) return res.status(404).render('404', { layout: false, titulo: 'Anime não encontrado' });
        
        await anime.increment('views');
        const episodiosOrdenados = (anime.episodios || []).sort((a, b) => a.numero - b.numero);
        const animeData = { ...anime.get({ plain: true }), episodios: episodiosOrdenados.map(ep => ep.get({ plain: true })) };
        
        res.render('detalhe-anime', { page_name: 'anime-detail', titulo: anime.titulo, anime: animeData });
    } catch (err) {
        res.status(500).render('500', { layout: false, titulo: 'Erro no Servidor', error: err });
    }
});

app.get('/assistir/:slug/:epId', proteger, async (req, res) => {
    try {
        const { slug, epId } = req.params;
        const anime = await db.Anime.findOne({ where: { slug }, include: [{ model: db.Episodio, as: 'episodios'}] });
        if (!anime) { return res.status(404).render('404', { layout: false, titulo: 'Anime não encontrado' }); }
        const episodioAtual = (anime.episodios || []).find(ep => ep.id.toString() === epId);
        if (!episodioAtual) { return res.status(404).render('404', { layout: false, titulo: 'Episódio não encontrado neste anime' }); }
        const todosEpisodiosOrdenados = (anime.episodios || []).sort((a, b) => { if (a.temporada !== b.temporada) return a.temporada - b.temporada; return a.numero - b.numero; });
        res.render('assistir', { page_name: 'player', initialAnime: anime.get({ plain: true }), initialEpisode: episodioAtual.get({ plain: true }), todosEpisodios: todosEpisodiosOrdenados.map(ep => ep.get({ plain: true })), titulo: `Assistindo: ${anime.titulo} - Ep. ${episodioAtual.numero}` });
    } catch (err) {
        console.error("ERRO CRÍTICO NA PÁGINA DO PLAYER:", err);
        res.status(500).render('500', { layout: false, titulo: 'Erro no Servidor', error: err });
    }
});

app.get('/perfil', proteger, (req, res) => {
    res.render('perfil', { page_name: 'perfil', titulo: 'Meu Perfil' });
});

app.get('/perfil/editar', proteger, (req, res) => {
    res.render('editar-perfil', { page_name: 'editar-perfil', titulo: 'Editar Perfil' });
});

app.get('/login', (req, res) => {
    if (res.locals.userIsLoggedIn) return res.redirect('/');
    res.render('login', { layout: false, page_name: 'login-page', titulo: 'Login/Registro' });
});

app.get('/admin/dashboard', proteger, admin, async (req, res) => {
    try {
        const [totalAnimes, totalPosts, totalUsers] = await Promise.all([db.Anime.count(), db.Post.count(), db.User.count()]);
        res.render('admin/dashboard', { layout: false, title: 'Painel de Administração', totalAnimes, totalPosts, totalUsers });
    } catch (err) {
        res.status(500).render('500', { layout: false, titulo: 'Erro no Servidor', error: err });
    }
});


// --- MÓDULO 5: ROTAS DE API (AÇÕES JSON) ---
app.use('/auth', authRoutes);

const apiRouter = express.Router();
app.use('/api', apiRouter);

// Aplicando middleware de proteção a todas as rotas da API
apiRouter.use(proteger);

// [CORREÇÃO 2/2] Rotas de Perfil do Usuário com os middlewares corretos.
// Esta é a correção final que resolve o erro "Unexpected field".
apiRouter.put('/user/profile', userApiController.updateUserProfile);
apiRouter.post('/user/profile/avatar', uploadAvatar, userApiController.updateUserAvatar);
// A linha abaixo agora usa 'uploadCapaPerfil', que espera o campo 'capa'.
apiRouter.post('/user/profile/capa', uploadCapaPerfil, userApiController.updateUserCapa); // <<<<<<<< CORREÇÃO APLICADA

// Aplicando middleware de 'admin' para todas as rotas de gerenciamento abaixo
apiRouter.use(admin);

// Adicionando a rota de upload de capa (para o painel de admin, mantida intacta)
apiRouter.post('/upload/capa', uploadCapa, (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'Nenhum arquivo de capa recebido.' });
    }
    res.json({ success: true, filePath: `/uploads/capas/${req.file.filename}` });
});

// Rotas de CRUD para Animes (Mantidas 100% Intactas)
apiRouter.get('/animes', animeApiController.getAllAnimes);
apiRouter.get('/animes/:slug', animeApiController.getAnimeBySlug);
apiRouter.post('/animes', processForm, animeApiController.createAnime);
apiRouter.put('/animes/:slug', processForm, animeApiController.updateAnime);
apiRouter.delete('/animes/:slug', animeApiController.deleteAnime);

// Rotas de CRUD para Episódios (Mantidas 100% Intactas)
apiRouter.post('/episodios', processForm, episodioApiController.createEpisodio);
apiRouter.delete('/episodios/:id', episodioApiController.deleteEpisodio);

// Rotas de CRUD para Notícias/Posts (Mantidas 100% Intactas)
apiRouter.get('/posts', postApiController.getAllPosts);
apiRouter.get('/posts/slug/:slug', postApiController.getPostBySlug);
apiRouter.post('/posts', processForm, postApiController.createPost);
apiRouter.put('/posts/:id', processForm, postApiController.updatePost);
apiRouter.delete('/posts/:id', postApiController.deletePost);

// Rotas de CRUD para Usuários (Mantidas 100% Intactas)
apiRouter.get('/users', userApiController.getAllUsers);
apiRouter.delete('/users/:id', userApiController.deleteUserByAdmin);


// --- MÓDULO 6: TRATAMENTO DE ERROS FINAIS E INICIALIZAÇÃO (INTACTOS) ---
app.use((req, res, next) => {
    res.status(404).render('404', { layout: false, titulo: 'Página Não Encontrada' });
});

app.use((err, req, res, next) => {
    console.error("ERRO FATAL:", err.stack);

    if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, error: `Erro de upload: ${err.message}. Código: ${err.code}` });
    }
    if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({ success: false, error: err.message });
    }

    res.status(500).render('500', { layout: false, titulo: 'Erro no Servidor', error: 'Ocorreu um problema inesperado.' });
});

// Sincroniza o banco de dados e inicia o servidor (INTACTO)
db.sequelize.sync({ alter: process.env.NODE_ENV === 'development' })
  .then(() => {
    console.log('✅ Banco de dados sincronizado e pronto.');
    app.listen(PORT, () => {
      console.log(`🚀 Servidor Akatsuki no ar em: http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ FALHA CRÍTICA AO INICIAR O SERVIDOR:', err);
    process.exit(1);
  });