// ==========================================================================
// ARQUIVO: server.js
// RESPONSABILIDADE: Importar a aplicação, conectar ao DB e iniciar o servidor.
// ==========================================================================

require('dotenv').config();
const app = require('./app'); // Importa a configuração do Express
const db = require('./models');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await db.sequelize.authenticate();
        console.log(`✅ Conexão com o banco de dados estabelecida com sucesso.`);

        // Use { force: false } para não apagar os dados a cada reinicialização
        await db.sequelize.sync({ force: false }); 
        console.log(`🔄 Modelos sincronizados com o banco de dados.`);

        app.listen(PORT, () => {
            console.log(`🚀 Servidor DenyAnimeHub rodando em http://localhost:${PORT}`);
        });

    } catch (err) {
        console.error('❌ Não foi possível conectar ao banco de dados e iniciar o servidor:', err);
        process.exit(1);
    }
};

startServer();
module.exports = app;