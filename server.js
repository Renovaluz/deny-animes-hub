// ==========================================================================
// ARQUIVO: server.js
// RESPONSABILIDADE: Importar a aplicação, conectar ao DB e iniciar o servidor.
// (Este é o arquivo que você executa com `node` ou `nodemon`).
// ==========================================================================

// 1. IMPORTA A APLICAÇÃO JÁ CONFIGURADA DO ARQUIVO app.js
const app = require('./app');

// 2. IMPORTA A CONEXÃO COM O BANCO DE DADOS
const db = require('./models');

// 3. DEFINE A PORTA
const PORT = process.env.PORT || 3000;

// 4. FUNÇÃO PARA INICIAR O SERVIDOR
const startServer = async () => {
    try {
        // Testa a conexão com o banco de dados.
        await db.sequelize.authenticate();
        console.log(`✅ Conexão com o banco de dados estabelecida com sucesso.`);
        
        // Sincroniza os modelos com o banco (útil em desenvolvimento).
        // Em produção, você pode querer remover ou usar 'alter: true'.
        await db.sequelize.sync({ force: false });
        console.log(`🔄 Modelos sincronizados com o banco de dados.`);
        
        // Inicia o servidor e o faz "ouvir" por requisições na porta definida.
        app.listen(PORT, () => {
            console.log(`🚀 Servidor DenyAnimeHub rodando em http://localhost:${PORT}`);
        });

    } catch (err) {
        // Se a conexão com o DB falhar, o servidor não inicia.
        console.error('❌ Não foi possível conectar ao banco de dados e iniciar o servidor:', err);
        process.exit(1); // Encerra o processo com um código de erro.
    }
};

// 5. EXECUTA A FUNÇÃO DE INICIALIZAÇÃO
startServer();