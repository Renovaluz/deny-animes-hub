// ====================================================================================
//
//              DenyAnimeHub - Middleware de Upload Especializado (Multer)
//
// Versão:        2.0 (Titan)
// Descrição:     Este middleware é o núcleo do sistema de upload de arquivos.
//                Ele utiliza a biblioteca 'multer' para processar dados multipart/form-data,
//                que são usados para enviar arquivos. A arquitetura é projetada para
//                ser segura e organizada, criando armazenamentos e filtros distintos
//                para cada tipo de upload (capas de anime, vídeos de episódios, avatares),
//                evitando conflitos e garantindo a integridade dos arquivos.
//
// ====================================================================================

'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Garante que um diretório no sistema de arquivos exista. Se não existir,
 * ele o cria de forma recursiva, prevenindo erros de "diretório não encontrado"
 * durante o upload.
 *
 * @param {string} dirPath - O caminho absoluto para o diretório a ser verificado/criado.
 */
const ensureDirExists = (dirPath) => {
    try {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log(`[Upload Middleware] Diretório de upload criado com sucesso: ${dirPath}`);
        }
    } catch (error) {
        console.error(`[Upload Middleware] Falha crítica ao criar diretório de upload: ${dirPath}`, error);
        // Em um cenário de produção, isso poderia notificar um administrador.
    }
};

/**
 * Cria uma configuração de armazenamento (StorageEngine) para o Multer.
 * Esta função é uma fábrica que gera configurações de armazenamento personalizadas
 * para diferentes tipos de arquivos, direcionando-os para subpastas específicas
 * dentro de 'public/uploads'.
 *
 * @param {string} destinationFolder - O nome da subpasta de destino (ex: 'capas', 'videos').
 * @returns {multer.StorageEngine} A configuração de armazenamento do Multer.
 */
const createStorageEngine = (destinationFolder) => {
    // Constrói o caminho completo e absoluto para a pasta de destino.
    const fullDestinationPath = path.join(__dirname, '..', 'public', 'uploads', destinationFolder);
    
    // Garante que a pasta de destino exista antes de qualquer upload.
    ensureDirExists(fullDestinationPath);

    return multer.diskStorage({
        // Define o diretório de destino para os arquivos enviados.
        destination: (req, file, cb) => {
            cb(null, fullDestinationPath);
        },
        // Define como os arquivos serão nomeados no servidor.
        filename: (req, file, cb) => {
            const fileExtension = path.extname(file.originalname);
            const originalName = path.basename(file.originalname, fileExtension);
            // Cria um nome de arquivo único para evitar sobreposição e problemas de cache.
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            // Formato do nome: nomeoriginal-timestamp-aleatorio.extensao
            const newFilename = `${originalName.replace(/\s+/g, '-')}-${uniqueSuffix}${fileExtension}`;
            cb(null, newFilename);
        }
    });
};

/**
 * Cria um filtro de arquivo para o Multer, validando o tipo de arquivo (MIME type).
 * @param {RegExp} allowedMimeTypesRegex - Uma expressão regular que corresponde aos MIME types permitidos.
 * @param {string} errorMessage - A mensagem de erro a ser exibida se o tipo de arquivo for inválido.
 * @returns {function} A função de filtro para ser usada pelo Multer.
 */
const createFileFilter = (allowedMimeTypesRegex, errorMessage) => {
    return (req, file, cb) => {
        if (allowedMimeTypesRegex.test(file.mimetype)) {
            cb(null, true); // Aceita o arquivo.
        } else {
            // Rejeita o arquivo com um erro customizado.
            cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname), false);
            // A rota que usa este middleware deve tratar este erro.
        }
    };
};

// --- Configurações Específicas para Cada Tipo de Upload ---

// 1. Upload de Capas de Animes
const capaStorage = createStorageEngine('capas');
const capaFileFilter = createFileFilter(/^image\/(jpeg|png|webp|gif)$/, 'Formato de imagem inválido.');
const uploadCapa = multer({
    storage: capaStorage,
    fileFilter: capaFileFilter,
    limits: {
        fileSize: 15 * 1024 * 1024 // Limite de 15MB para capas de alta qualidade.
    }
});

// 2. Upload de Vídeos de Episódios
const videoStorage = createStorageEngine('videos');
const videoFileFilter = createFileFilter(/^video\/(mp4|x-matroska|webm)$/, 'Formato de vídeo inválido.');
const uploadVideo = multer({
    storage: videoStorage,
    fileFilter: videoFileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024 * 1024 // Limite generoso de 2GB por episódio.
    }
});

// 3. Upload de Avatares de Usuários
const avatarStorage = createStorageEngine('avatars');
const avatarFileFilter = createFileFilter(/^image\/(jpeg|png|webp)$/, 'Formato de imagem inválido.');
const uploadAvatar = multer({
    storage: avatarStorage,
    fileFilter: avatarFileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // Limite de 5MB para avatares.
    }
});

// 4. Upload de Imagens de Notícias/Posts
const postImageStorage = createStorageEngine('images');
const postImageFileFilter = createFileFilter(/^image\/(jpeg|png|webp|gif)$/, 'Formato de imagem inválido.');
const uploadImagemPost = multer({
    storage: postImageStorage,
    fileFilter: postImageFileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // Limite de 10MB para imagens de post.
    }
});


// Exportamos cada "especialista" de upload para ser usado de forma granular nas rotas.
module.exports = {
    uploadCapa,
    uploadVideo,
    uploadAvatar,
    uploadImagemPost
};