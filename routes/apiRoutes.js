const express = require('express');
const router = express.Router();
const { admin } = require('../middleware/adminMiddleware');
const { proteger } = require('../middleware/authMiddleware');

// Importando os controllers
const animeApiController = require('../controllers/animeController');
const postApiController = require('../controllers/postController');
const userApiController = require('../controllers/userController');

// Importando as funções de upload específicas e nomeadas do nosso middleware especialista
const { uploadAvatar, uploadCapa, uploadImagemPost } = require('../middleware/uploadMiddleware');

// Todas as rotas definidas neste arquivo serão prefixadas com /api e são protegidas
router.use(proteger);

// --- Rotas de Animes (Admin) ---
router.get('/animes', admin, animeApiController.getAllAnimes);
router.post('/animes', admin, animeApiController.createAnime);
router.get('/animes/:id', admin, animeApiController.getAnimeById);
router.put('/animes/:id', admin, animeApiController.updateAnime);
router.delete('/animes/:id', admin, animeApiController.deleteAnime);

// --- Rotas de Episódios (Admin) ---
router.post('/animes/:id/episodes', admin, animeApiController.addEpisode);
router.delete('/animes/:id/episodes/:epNum', admin, animeApiController.deleteEpisode);

// --- Rotas de Notícias (Admin) ---
router.get('/posts', admin, postApiController.getAllPosts);
router.post('/posts', admin, postApiController.createPost);
router.get('/posts/:id', admin, postApiController.getPostById);
router.put('/posts/:id', admin, postApiController.updatePost);
router.delete('/posts/:id', admin, postApiController.deletePost);

// --- Rotas de Usuários (Admin) ---
router.get('/users', admin, userApiController.getAllUsers);
router.delete('/users/:id', admin, userApiController.deleteUserByAdmin);
// Se você tiver uma rota para admin atualizar um usuário, ela iria aqui:
// router.put('/users/:id', admin, userApiController.updateUserByAdmin);

// --- Rota de Upload para Posts de Animes/Notícias (Admin) ---
// Usa o 'uploadImagemPost' que salva na pasta /images
router.post('/upload/image', admin, uploadImagemPost.single('imagem'), (req, res) => {
    if (req.file) {
        // Retorna o caminho público completo e correto para a imagem
        res.json({ success: true, filePath: `/uploads/images/${req.file.filename}` });
    } else {
        res.status(400).json({ success: false, error: 'Falha no upload do arquivo.' });
    }
});

// --- Rotas de Upload para Perfil de Usuário ---
// Cada rota usa seu próprio especialista de upload
router.post('/user/profile/avatar', uploadAvatar.single('avatar'), userApiController.updateUserAvatar);
router.post('/user/profile/capa', uploadCapa.single('capa'), userApiController.updateUserCapa);

module.exports = router;