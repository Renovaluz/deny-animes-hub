// ====================================================================================
//
//              DenyAnimeHub - Ponto de Entrada Principal (Versão Definitiva Completa)
//
// Versão:        28.0 (Criação de Todas as Coisas)
// Descrição:     Versão final e robusta que integra as novas rotas de API para
//                comentários e classificações, mantendo 100% do código original
//                intacto e funcional. Este é o arquivo completo, sem omissões.
//
// ====================================================================================

// --- MÓDULO 1: IMPORTAÇÕES E CONFIGURAÇÃO DE AMBIENTE ---
require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const db = require('./models');
const multer = require('multer');
const { Sequelize, Op } = require('sequelize');
const slugify = require('./utils/slugify');

// Middlewares
const { proteger, admin, protegerOpcional } = require('./middleware/authMiddleware');
const { 
    processForm, 
    uploadAvatar, 
    uploadCapa, 
    uploadCapaPerfil,
    uploadVideo 
} = require('./middleware/uploadMiddleware');

// Controllers
const authController = require('./controllers/authController');
const postApiController = require('./controllers/postController');
const userApiController = require('./controllers/userController');
const animeApiController = require('./controllers/animeController');
const episodioApiController = require('./controllers/episodioController');
const downloadController = require('./controllers/downloadController'); 
const interactionController = require('./controllers/interactionController');

// Rota de autenticação
const authRoutes = require('./routes/authRoutes'); 

// --- MÓDULO 2: INICIALIZAÇÃO E CONFIGURAÇÃO DO EXPRESS ---
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

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

// --- MÓDULO 4: ROTAS DE VISUALIZAÇÃO E DOWNLOAD ---
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
        
        res.render('detalhe-anime', { page_name: 'anime-detail', titulo: anime.titulo, anime: animeData, db: db });
    } catch (err) {
        res.status(500).render('500', { layout: false, titulo: 'Erro no Servidor', error: err });
    }
});

app.get('/assistir/:slug/:epId', proteger, async (req, res) => {
    try {
        const { slug, epId } = req.params;
        const anime = await db.Anime.findOne({ where: { slug }, include: [{ model: db.Episodio, as: 'episodios' }] });
        if (!anime) { return res.status(404).render('404', { layout: false, titulo: 'Anime não encontrado' }); }
        
        const episodioAtual = (anime.episodios || []).find(ep => ep.id.toString() === epId);
        if (!episodioAtual) { return res.status(404).render('404', { layout: false, titulo: 'Episódio não encontrado' }); }
        
        const todosEpisodiosOrdenados = (anime.episodios || []).sort((a, b) => {
            if (a.temporada !== b.temporada) return a.temporada - b.temporada;
            return a.numero - b.numero;
        });

        const sugestoes = await db.Anime.findAll({
            where: { id: { [Op.ne]: anime.id } },
            order: [[Sequelize.fn('RANDOM')]],
            limit: 4
        });
        
        res.render('assistir', { 
            layout: 'layouts/main', 
            page_name: 'player', 
            initialAnime: anime.get({ plain: true }), 
            initialEpisode: episodioAtual.get({ plain: true }), 
            todosEpisodios: todosEpisodiosOrdenados.map(ep => ep.get({ plain: true })),
            sugestoes: sugestoes.map(s => s.get({ plain: true })),
            titulo: `Assistindo: ${anime.titulo} - Ep. ${episodioAtual.numero}` 
        });
    } catch (err) {
        console.error("ERRO CRÍTICO NA PÁGINA DO PLAYER:", err);
        res.status(500).render('500', { layout: false, titulo: 'Erro no Servidor', error: err });
    }
});

app.get('/perfil', proteger, async (req, res) => {
    try {
        const historico = await db.Historico.findAll({
            where: { userId: req.user.id },
            limit: 10,
            order: [['updatedAt', 'DESC']],
            include: [
                { model: db.Anime, as: 'anime' },
                { model: db.Episodio, as: 'episodio' }
            ]
        });
        res.render('perfil', {
            page_name: 'perfil',
            titulo: 'Meu Perfil',
            user: req.user.get({ plain: true }),
            historico: historico.map(h => h.get({ plain: true }))
        });
    } catch (error) {
        console.error("Erro ao carregar a página de perfil:", error);
        res.status(500).render('500', { layout: false, titulo: 'Erro no Servidor', error });
    }
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

const protegerComChaveApi = (req, res, next) => {
    const chaveApi = req.headers['x-api-key'];
    if (!chaveApi || chaveApi !== process.env.AUTOMATION_API_KEY) {
        return res.status(401).json({ success: false, error: 'Acesso não autorizado.' });
    }
    next();
};
apiRouter.post('/automacao/postar-anime-completo', protegerComChaveApi, async (req, res) => {
    const { titulo, sinopse, anoLancamento, generos, imagemCapa, episodios } = req.body;
    if (!titulo || !sinopse || !imagemCapa || !episodios || !Array.isArray(episodios)) {
        return res.status(400).json({ success: false, error: 'Dados incompletos ou malformados.' });
    }
    const transaction = await db.sequelize.transaction();
    try {
        const novoAnime = await db.Anime.create({
            titulo, slug: slugify(titulo), sinopse,
            anoLancamento: anoLancamento || new Date().getFullYear(),
            generos: generos || [], imagemCapa,
        }, { transaction });
        const episodiosParaCriar = episodios.map(ep => ({ ...ep, animeId: novoAnime.id }));
        await db.Episodio.bulkCreate(episodiosParaCriar, { transaction });
        await transaction.commit();
        res.status(201).json({ success: true, message: `Anime "${titulo}" e ${episodios.length} episódios cadastrados.` });
    } catch (error) {
        await transaction.rollback();
        console.error("[AUTOMAÇÃO] Erro:", error);
        if (error.name === 'SequelizeUniqueConstraintError') {
             return res.status(409).json({ success: false, error: `O anime "${titulo}" já existe.` });
        }
        res.status(500).json({ success: false, error: 'Erro interno no servidor.' });
    }
});

apiRouter.use(proteger);

// Rotas de Usuário
apiRouter.put('/user/profile', userApiController.updateUserProfile);
apiRouter.post('/user/profile/avatar', uploadAvatar, userApiController.updateUserAvatar);
apiRouter.post('/user/profile/capa', uploadCapaPerfil, userApiController.updateUserCapa);
apiRouter.post('/history/update', async (req, res) => {
    const { animeId, episodioId, progress } = req.body;
    const userId = req.user.id;
    if (!animeId || !episodioId) return res.status(400).json({ success: false, error: 'Dados de histórico incompletos.' });
    try {
        const [historyRecord, created] = await db.Historico.findOrCreate({
            where: { userId, episodioId },
            defaults: { animeId, progress: progress || 0 }
        });
        if (!created) {
            historyRecord.progress = progress || historyRecord.progress;
            await historyRecord.save();
        }
        res.status(200).json({ success: true, message: 'Histórico atualizado.' });
    } catch (error) {
        console.error("Erro ao atualizar histórico:", error);
        res.status(500).json({ success: false, error: 'Erro interno ao atualizar o histórico.' });
    }
});

// Rotas de Interação (Comentários e Avaliações)
apiRouter.get('/comments/:animeId', interactionController.getComments);
apiRouter.post('/comments', interactionController.postComment);
apiRouter.post('/ratings', interactionController.postRating);

// Rotas de Admin
apiRouter.use(admin);
apiRouter.post('/upload/capa', uploadCapa, (req, res) => {
    if (!req.file) { return res.status(400).json({ success: false, error: 'Nenhum arquivo recebido.' }); }
    res.json({ success: true, filePath: `/uploads/capas/${req.file.filename}` });
});

apiRouter.get('/animes', animeApiController.getAllAnimes);
apiRouter.get('/animes/:slug', animeApiController.getAnimeBySlug);
apiRouter.post('/animes', processForm, animeApiController.createAnime);
apiRouter.put('/animes/:slug', processForm, animeApiController.updateAnime);
apiRouter.delete('/animes/:slug', animeApiController.deleteAnime);

apiRouter.post('/episodios', processForm, episodioApiController.createEpisodio);
apiRouter.delete('/episodios/:id', episodioApiController.deleteEpisodio);

apiRouter.get('/posts', postApiController.getAllPosts);
apiRouter.get('/posts/slug/:slug', postApiController.getPostBySlug);
apiRouter.post('/posts', processForm, postApiController.createPost);
apiRouter.put('/posts/:id', processForm, postApiController.updatePost);
apiRouter.delete('/posts/:id', postApiController.deletePost);

apiRouter.get('/users', userApiController.getAllUsers);
apiRouter.delete('/users/:id', userApiController.deleteUserByAdmin);


// --- MÓDULO 6: TRATAMENTO DE ERROS FINAIS E INICIALIZAÇÃO ---
app.use((req, res, next) => {
    res.status(404).render('404', { layout: false, titulo: 'Página Não Encontrada' });
});

app.use((err, req, res, next) => {
    console.error("ERRO FATAL:", err.stack);
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, error: `Erro de upload: ${err.message}.` });
    }
    if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({ success: false, error: err.message });
    }
    res.status(500).render('500', { layout: false, titulo: 'Erro no Servidor', error: 'Ocorreu um problema inesperado.' });
});

db.sequelize.sync({ alter: true })
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