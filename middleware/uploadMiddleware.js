const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Garante que um diretório exista. Se não existir, ele o cria de forma recursiva.
 * @param {string} dirPath - O caminho completo para o diretório a ser verificado/criado.
 */
const ensureDirExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`[Upload Middleware] Pasta de upload criada: ${dirPath}`);
    }
};

/**
 * Cria uma configuração de armazenamento para o Multer que direciona os arquivos
 * para uma pasta de destino específica dentro de 'public/uploads'.
 * @param {string} destinationFolder - O nome da subpasta (ex: 'avatars', 'capas', 'images').
 * @returns {multer.StorageEngine} A configuração de armazenamento do Multer.
 */
const storageConfig = (destinationFolder) => multer.diskStorage({
    destination: (req, file, cb) => {
        // Constrói o caminho completo a partir do diretório atual até a pasta de destino.
        const uploadPath = path.join(__dirname, `../public/uploads/${destinationFolder}`);
        ensureDirExists(uploadPath); // Garante que a pasta específica ('avatars', 'capas', 'images') exista
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Gera um nome de arquivo único para evitar sobreposição e conflitos de nome.
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        // Usa o nome do campo do formulário (fieldname) para mais clareza no nome do arquivo (ex: 'avatar-12345.jpg').
        cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
    }
});

/**
 * Filtro de arquivo para o Multer, garantindo que apenas imagens sejam aceitas.
 * @param {object} req - O objeto da requisição.
 * @param {object} file - O objeto do arquivo enviado.
 * @param {function} cb - O callback a ser chamado.
 */
const fileFilter = (req, file, cb) => {
    // Verifica o mimetype do arquivo (ex: 'image/jpeg', 'image/png').
    if (file.mimetype.startsWith('image/')) {
        cb(null, true); // Aceita o arquivo.
    } else {
        // Rejeita o arquivo com uma mensagem de erro clara.
        cb(new Error('Formato de arquivo não suportado! Apenas imagens são permitidas.'), false);
    }
};

// Criamos instâncias de upload SEPARADAS para cada tipo de imagem.
// Cada uma tem seu próprio destino e pode ter limites de tamanho diferentes.
const uploadAvatar = multer({ storage: storageConfig('avatars'), fileFilter: fileFilter, limits: { fileSize: 1024 * 1024 * 5 } }); // Limite de 5MB
const uploadCapa = multer({ storage: storageConfig('capas'), fileFilter: fileFilter, limits: { fileSize: 1024 * 1024 * 10 } }); // Limite de 10MB
const uploadImagemPost = multer({ storage: storageConfig('images'), fileFilter: fileFilter, limits: { fileSize: 1024 * 1024 * 10 } }); // Limite de 10MB

// Exportamos cada "especialista" de upload para ser usado nas rotas correspondentes.
module.exports = {
    uploadAvatar,
    uploadCapa,
    uploadImagemPost
};