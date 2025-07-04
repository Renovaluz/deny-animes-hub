require('dotenv').config();
const db = require('./models'); // Importa o index.js da pasta models
const animesData = require('./data/animes');
const postsData = require('./data/posts');

// Função para sincronizar o banco de dados (cria as tabelas) e popular com dados
const setupDatabase = async () => {
    try {
        console.log('Iniciando sincronização com o banco de dados...');
        // O { force: true } apaga as tabelas existentes e as recria.
        // CUIDADO: Use isso apenas em desenvolvimento para resetar o banco.
        await db.sequelize.sync({ force: true });
        console.log('✅ Tabelas sincronizadas com sucesso.');

        console.log('Criando usuário admin padrão...');
        const adminUser = await db.User.create({
            nome: 'Admin DenyAnimeHub',
            email: 'admin@denyanimehub.com',
            senha: 'password123', // a senha será hasheada pelo hook do model
            role: 'admin'
        });
        console.log(`✅ Usuário admin criado com ID: ${adminUser.id}`);

        console.log('Importando dados de animes...');
        await db.Anime.bulkCreate(animesData);
        console.log('✅ Animes importados com sucesso.');

        console.log('Importando dados de notícias...');
        const postsComAutor = postsData.map(post => ({
            ...post,
            autorId: adminUser.id, // Associa cada post ao admin criado
            autorNome: adminUser.nome
        }));
        await db.Post.bulkCreate(postsComAutor);
        console.log('✅ Notícias importadas com sucesso.');

        console.log('\n=====================================');
        console.log('🚀 Configuração do banco de dados concluída!');
        console.log('=====================================');

    } catch (error) {
        console.error('❌ Erro durante a configuração do banco de dados:', error);
    } finally {
        await db.sequelize.close();
    }
};

setupDatabase();