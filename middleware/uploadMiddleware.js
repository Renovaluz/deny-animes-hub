// ====================================================================================
//
//              DenyAnimeHub - Middleware de Upload (Versão Final e Robusta)
//
// Versão:        4.0 (Susanoo Perfeito)
// Descrição:     Versão definitiva do middleware Multer. Totalmente funcional,
//                com middlewares especializados e explícitos para cada tipo de
//                upload (avatar, capa de perfil, etc.), evitando conflitos de
//                nomes de campos e garantindo 100% de compatibilidade com as rotas.
//
// ====================================================================================

'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Garante que um diretório no sistema de arquivos exista. Se não existir,
 * ele o cria de forma recursiva, prevenindo erros de "diretório não encontrado".
 * @param {string} dirPath - O caminho absoluto para o diretório a ser verificado/criado.
 */
const ensureDirExists = (dirPath) => {
    try {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    } catch (error) {
        console.error(`[Upload Middleware] Falha crítica ao criar diretório de upload: ${dirPath}`, error);
    }
};

/**
 * Cria uma configuração de armazenamento (StorageEngine) para o Multer,
 * direcionando arquivos para subpastas específicas e gerando nomes únicos.
 * @param {string} destinationFolder - O nome da subpasta de destino (ex: 'capas', 'avatars').
 * @returns {multer.StorageEngine} A configuração de armazenamento do Multer.
 */
const createStorageEngine = (destinationFolder) => {
    const fullDestinationPath = path.join(__dirname, '..', 'public', 'uploads', destinationFolder);
    ensureDirExists(fullDestinationPath);

    return multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, fullDestinationPath);
        },
        filename: (req, file, cb) => {
            const fileExtension = path.extname(file.originalname);
            const fieldName = file.fieldname || 'file';
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const newFilename = `${fieldName}-${uniqueSuffix}${fileExtension}`;
            cb(null, newFilename);
        }
    });
};

/**
 * Cria um filtro de arquivo para o Multer, validando o tipo de arquivo (MIME type).
 * @param {RegExp} allowedMimeTypesRegex - Expressão regular para os MIME types permitidos.
 * @returns {function} A função de filtro para o Multer.
 */
const createFileFilter = (allowedMimeTypesRegex) => {
    return (req, file, cb) => {
        if (allowedMimeTypesRegex.test(file.mimetype)) {
            cb(null, true); // Aceita o arquivo.
        } else {
            const error = new Error('Tipo de arquivo não suportado!');
            error.code = 'INVALID_FILE_TYPE';
            cb(error, false); // Rejeita o arquivo.
        }
    };
};

// --- Filtros de Arquivo Pré-configurados ---
const imageFileFilter = createFileFilter(/^image\/(jpeg|png|webp|gif)$/);
const videoFileFilter = createFileFilter(/^video\/(mp4|x-matroska|webm)$/);

// =======================================================================================
//  MIDDLEWARES DE UPLOAD ESPECIALIZADOS E EXPORTADOS
// =======================================================================================

// Middleware para processar formulários multipart/form-data (campos de texto + arquivos).
// Mantido como no seu original para não quebrar outras funcionalidades.
const processForm = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 * 1024 }
}).any();

// Middleware para upload de Capas de Animes/Posts (espera campo 'file').
// Mantido como no seu original para não quebrar outras funcionalidades.
const uploadCapa = multer({
    storage: createStorageEngine('capas'),
    fileFilter: imageFileFilter,
    limits: { fileSize: 15 * 1024 * 1024 }
}).single('file');

// Middleware para upload de Vídeos de Episódios (espera campo 'file').
// Mantido como no seu original.
const uploadVideo = multer({
    storage: createStorageEngine('videos'),
    fileFilter: videoFileFilter,
    limits: { fileSize: 2 * 1024 * 1024 * 1024 }
}).single('file');

// Middleware para upload de AVATAR de Usuário (espera campo 'avatar').
// Esta configuração está correta e funcional.
const uploadAvatar = multer({
    storage: createStorageEngine('avatars'),
    fileFilter: imageFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
}).single('avatar');

// [NOVO E CORRIGIDO] Middleware para upload de CAPA DE PERFIL de Usuário (espera campo 'capa').
// Este é o middleware específico que a sua rota de edição de perfil precisa.
const uploadCapaPerfil = multer({
    storage: createStorageEngine('capas'), // Reutiliza a pasta 'capas'
    fileFilter: imageFileFilter,
    limits: { fileSize: 15 * 1024 * 1024 } // Limite de 15MB
}).single('capa'); // A CORREÇÃO: Espera um campo chamado 'capa', como enviado pelo front-end.


// Exporta todos os middlewares para serem usados nas rotas.
module.exports = {
    processForm,
    uploadCapa,
    uploadVideo,
    uploadAvatar,
    uploadCapaPerfil // Exporta o novo middleware corrigido
};