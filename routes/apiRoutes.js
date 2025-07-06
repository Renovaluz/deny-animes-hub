const express = require('express');
const router = express.Router();
const { admin } = require('../middleware/adminMiddleware');

// Importando os controllers
const animeApiController = require('../controllers/animeController');
const postApiController = require('../controllers/postController');
const userApiController = require('../controllers/userController');
const upload = require('../middleware/uploadMiddleware');

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

// --- Rota de Upload (Admin) ---
router.post('/upload/image', admin, upload.single('imagem'), (req, res) => {
    if (req.file) {
        res.json({ success: true, filePath: `/uploads/images/${req.file.filename}` });
    } else {
        res.status(400).json({ success: false, error: 'Falha no upload do arquivo.' });
    }
});

module.exports = router;