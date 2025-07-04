// ==========================================================================
// ARQUIVO: server.js
// RESPONSABILIDADE: Importar a aplicação, conectar ao DB e iniciar o servidor.
// ==========================================================================

const app = require('./app'); // Apontando para o app.js
const db = require('./models'); // Conexão com Sequelize

// Usa a porta do Render (ou 3000 localmente)
const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        // Tenta conectar ao banco de dados
        await db.sequelize.authenticate();
        console.log(`✅ Conexão com o banco de dados estabelecida com sucesso.`);

        // Sincroniza os modelos
        await db.sequelize.sync({ force: false });
        console.log(`🔄 Modelos sincronizados com o banco de dados.`);

        // Inicia o servidor
        app.listen(PORT, () => {
            console.log(`🚀 Servidor DenyAnimeHub rodando em http://localhost:${PORT}`);
        });

    } catch (err) {
        console.error('❌ Não foi possível conectar ao banco de dados e iniciar o servidor:', err);
        process.exit(1);
    }
};

startServer();
// Exporta o app para testes ou outros usos
module.exports = app;