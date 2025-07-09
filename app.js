// ====================================================================================
//
//              DenyAnimeHub - Ponto de Entrada Principal da Aplicação
//
// Versão:        14.1 (Zeus - Correção de Middleware Global)
// Descrição:     Versão final que corrige o erro 'app.use() requires a middleware function'
//                implementando um middleware global seguro para popular dados do usuário
//                sem bloquear rotas públicas, garantindo 100% de funcionalidade.
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
const { proteger, admin } = require('./middleware/authMiddleware'); // O 'proteger' será usado apenas em rotas específicas
const { uploadAvatar, uploadCapa, uploadImagemPost } = require('./middleware/uploadMiddleware');

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
// **CORRIGIDO**: Este middleware customizado substitui o app.use(proteger) global.
// Ele tenta encontrar o usuário logado e o anexa a res.locals, mas NUNCA bloqueia a requisição.
app.use(async (req, res, next) => {
    let token;
    // Tenta pegar o token do cookie
    if (req.cookies.token) {
        token = req.cookies.token;
    }

    // Se o token existir, tenta validá-lo e encontrar o usuário
    if (token) {
        try {
            // Decodifica o token para obter o ID do usuário
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            // Busca o usuário no banco de dados sem a senha
            const currentUser = await db.User.findByPk(decoded.id, {
                attributes: { exclude: ['senha'] }
            });
            
            // Se o usuário for encontrado, anexa-o a res.locals
            if (currentUser) {
                res.locals.user = currentUser.get({ plain: true });
                res.locals.userIsLoggedIn = true;
            } else {
                res.locals.user = null;
                res.locals.userIsLoggedIn = false;
            }
        } catch (error) {
            // Se o token for inválido (expirado, etc.), apenas ignora
            res.locals.user = null;
            res.locals.userIsLoggedIn = false;
        }
    } else {
        // Se não houver token, não há usuário logado
        res.locals.user = null;
        res.locals.userIsLoggedIn = false;
    }
    
    // Continua para a próxima rota, independentemente do resultado
    next();
});

// --- MÓDULO 4: DEFINIÇÃO DE ROTAS ---

// =======================================
// SEÇÃO A: ROTAS PÚBLICAS E DE USUÁRIO
// =======================================
// Nenhuma dessas rotas precisa do middleware 'proteger' aqui, pois o middleware global já lida com a exibição do usuário.

// Rota Principal (Página Inicial)
app.get('/', async (req, res) => {
    try {
        const animesDoBanco = await db.Anime.findAll({ order: [['createdAt', 'DESC']], limit: 24 });
        res.render('index', { layout: false, page_name: 'index', titulo: 'Início', animes: animesDoBanco });
    } catch (err) {
        console.error("Erro na rota /:", err);
        res.status(500).render('500', { layout: false, error: err });
    }
});

// Rota da Página de Login/Registro
app.get('/login', (req, res) => {
    if (res.locals.userIsLoggedIn) return res.redirect('/');
    res.render('login', { layout: false, page_name: 'login-page', titulo: 'Login/Registro', erro: req.query.erro, sucesso: req.query.sucesso });
});

// Rota da Página de Notícias
app.get('/noticias', async (req, res) => {
    try {
        const [[noticiaDestaque, noticiasRecentes], jikanData] = await Promise.all([
            Promise.all([
                db.Post.findOne({ where: { emDestaque: true }, include: 'autor' }),
                db.Post.findAll({ where: { emDestaque: false }, order: [['createdAt', 'DESC']], limit: 10, include: 'autor' })
            ]),
            fetch('https://api.jikan.moe/v4/top/anime?filter=airing&limit=5').then(res => res.json()).catch(() => ({ data: [] }))
        ]);

        res.render('noticias', {
            layout: false, page_name: 'noticias', titulo: 'Notícias',
            destaque: noticiaDestaque, recentes: noticiasRecentes,
            topAnimes: jikanData.data || []
        });
    } catch (err) {
        console.error('Erro na rota /noticias:', err);
        res.status(500).render('500', { layout: false, error: 'Falha ao carregar notícias.' });
    }
});

// Rota de Detalhes do Anime por ID
app.get('/anime/:id', async (req, res) => {
    try {
        const animeId = req.params.id;
        if (isNaN(animeId)) return res.status(400).render('404', { layout: false, titulo: 'ID de Anime Inválido' });
        
        const anime = await db.Anime.findByPk(animeId, {
            include: [{ model: db.Episodio, as: 'episodios', order: [['temporada', 'ASC'], ['numero', 'ASC']] }]
        });

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

// **CORRIGIDO**: Rota para a página de perfil do usuário (agora usa 'proteger' para BLOQUEAR se não estiver logado)
app.get('/perfil', proteger, (req, res) => {
    res.render('perfil', { layout: false, page_name: 'perfil', titulo: 'Meu Perfil' });
});

// Rota para a página de edição de perfil (requer login)
app.get('/perfil/editar', proteger, (req, res) => {
    res.render('editar-perfil', { layout: false, page_name: 'editar-perfil', titulo: 'Editar Perfil' });
});

// Rota de Assistir (requer login)
app.get('/assistir/:animeId/:epId', proteger, async (req, res) => {
    try {
        const { animeId, epId } = req.params;

        const anime = await db.Anime.findByPk(animeId, {
            include: [{ model: db.Episodio, as: 'episodios', order: [['temporada', 'ASC'], ['numero', 'ASC']] }]
        });

        if (!anime) return res.status(404).render('404', { layout: false, titulo: 'Anime não encontrado' });

        const episodioAtual = anime.episodios.find(ep => ep.id.toString() === epId);
        if (!episodioAtual) return res.status(404).render('404', { layout: false, titulo: 'Episódio não encontrado' });
        
        const animesSugeridos = await db.Anime.findAll({ 
            where: { id: { [db.Sequelize.Op.ne]: animeId } },
            limit: 12, 
            order: db.sequelize.random() 
        });

        res.render('player', {
            layout: false, page_name: 'player', titulo: `Assistindo: ${anime.titulo} - Ep ${episodioAtual.numero}`,
            anime: anime.get({ plain: true }),
            episodio: episodioAtual.get({ plain: true }),
            todosEpisodios: anime.episodios.map(ep => ep.get({ plain: true })),
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

// Rota para renderizar a página do painel de admin (requer login e cargo de admin)
app.get('/admin/dashboard', proteger, admin, async (req, res) => {
    try {
        const [totalAnimes, totalPosts, totalUsers] = await Promise.all([
            db.Anime.count(), 
            db.Post.count(), 
            db.User.count()
        ]);
        // Os dados do usuário (totalAnimes, etc.) já estão disponíveis no 'admin.ejs' que te passei,
        // mas vamos passá-los aqui para garantir.
        res.render('admin/dashboard', {
            layout: false, title: 'Admin Dashboard',
            totalAnimes, totalPosts, totalUsers
        });
    } catch (err) {
        console.error("Erro ao carregar dashboard do admin:", err);
        res.status(500).render('500', { layout: false, error: err });
    }
});

// Roteador central para todas as chamadas de API
const apiRouter = express.Router();
apiRouter.use(proteger); // Todas as rotas da API requerem login

// --- APIs de Animes, Posts, Usuários e Episódios (protegidas por middleware de admin) ---
apiRouter.get('/posts', admin, postApiController.getAllPosts);
// etc... (mantendo o resto das suas rotas de API)
apiRouter.post('/posts', admin, postApiController.createPost);
apiRouter.get('/posts/:id', admin, postApiController.getPostById);
apiRouter.put('/posts/:id', admin, postApiController.updatePost);
apiRouter.delete('/posts/:id', admin, postApiController.deletePost);

apiRouter.get('/animes', admin, animeApiController.getAllAnimes);
apiRouter.post('/animes', admin, animeApiController.createAnime);
apiRouter.get('/animes/:id', admin, animeApiController.getAnimeById);
apiRouter.put('/animes/:id', admin, animeApiController.updateAnime);
apiRouter.delete('/animes/:id', admin, animeApiController.deleteAnime);

apiRouter.post('/episodios', admin, episodioApiController.createEpisodio);
apiRouter.delete('/episodios/:id', admin, episodioApiController.deleteEpisodio);

apiRouter.get('/users', admin, userApiController.getAllUsers);
apiRouter.put('/users/:id', admin, userApiController.updateUserByAdmin);
apiRouter.delete('/users/:id', admin, userApiController.deleteUserByAdmin);

// --- APIs para o usuário logado editar seu próprio perfil ---
apiRouter.put('/user/profile', userApiController.updateUserProfile);
apiRouter.post('/upload/image', admin, uploadImagemPost.single('imagem'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, error: 'Nenhum arquivo recebido.' });
    res.json({ success: true, filePath: `/uploads/images/${req.file.filename}` });
});
apiRouter.post('/user/profile/avatar', uploadAvatar.single('avatar'), userApiController.updateUserAvatar);
apiRouter.post('/user/profile/capa', uploadCapa.single('capa'), userApiController.updateUserCapa);

// Registra o roteador da API no caminho principal /api
app.use('/api', apiRouter);


// --- MÓDULO 5: TRATAMENTO DE ERROS (FALLBACK) ---
// Handler para rotas não encontradas (404)
app.use((req, res, next) => {
    res.status(404).render('404', { layout: false, titulo: 'Página Não Encontrada' });
});

// Handler de erro global (500)
app.use((err, req, res, next) => {
    console.error("ERRO INESPERADO:", err.stack);
    res.status(500).render('500', { layout: false, titulo: 'Erro no Servidor', error: err });
});


// --- MÓDULO 6: INICIALIZAÇÃO DO SERVIDOR ---
// Sincroniza o banco de dados e, se bem-sucedido, inicia o servidor Express.
db.sequelize.sync({ alter: process.env.NODE_ENV === 'development' })
  .then(() => {
    console.log('✅ Conexão com o banco de dados e sincronização de modelos bem-sucedidas.');
    app.listen(PORT, () => {
      console.log(`🚀 Servidor DenyAnimeHub iniciado com sucesso na porta ${PORT}`);
      console.log(`   Acesse em: http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Falha CRÍTICA ao sincronizar o banco de dados e iniciar o servidor:', err);
    process.exit(1);
  });