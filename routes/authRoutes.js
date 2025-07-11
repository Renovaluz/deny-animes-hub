// ARQUIVO: routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/registrar', authController.registrar); // Ação da API
router.post('/login', authController.login);       // Ação da API
router.get('/logout', authController.logout);      // Ação de Redirecionamento

module.exports = router;