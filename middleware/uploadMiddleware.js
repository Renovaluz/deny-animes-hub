// middleware/uploadMiddleware.js

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Garante que o diretório de uploads exista
// __dirname é o diretório atual (middleware), '..' volta um nível para a raiz do projeto
const uploadDir = path.join(__dirname, '..', 'public/uploads');
if (!fs.existsSync(uploadDir)) {
    // Cria o diretório se ele não existir
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuração de armazenamento do Multer
const storage = multer.diskStorage({
    // Define o destino dos arquivos
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    // Define o nome do arquivo para ser único, evitando sobreposições
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + extension);
    }
});

// Filtro para aceitar apenas tipos de arquivo de imagem
const fileFilter = (req, file, cb) => {
    // Expressão regular para verificar a extensão e o mimetype
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
        // Aceita o arquivo
        return cb(null, true);
    }
    // Rejeita o arquivo com uma mensagem de erro clara
    cb(new Error('Erro: Apenas imagens são permitidas (jpeg, jpg, png, gif, webp).'));
};

// Cria a instância do Multer com as configurações
const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 5 }, // Limite de 5MB por arquivo
    fileFilter: fileFilter
});

module.exports = upload;