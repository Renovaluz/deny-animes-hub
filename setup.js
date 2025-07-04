require('dotenv').config();
const db = require('./models');
const animesData = require('./data/animes');
const postsData = require('./data/posts');

const setupDatabase = async () => {
    try {
        console.log('Iniciando sincronização com o banco de dados...');
        await db.sequelize.sync({ force: true });
        console.log('✅ Tabelas sincronizadas com sucesso.');

        console.log('Criando usuário admin padrão...');
        const adminUser = await db.User.create({
            nome: 'Admin DenyAnimeHub',
            email: 'admin@denyanimehub.com',
            senha: 'password123',
            role: 'admin'
        });
        console.log(`✅ Usuário admin criado com ID: ${adminUser.id}`);

        console.log('Importando dados de animes...');
        await db.Anime.bulkCreate(animesData);
        console.log('✅ Animes importados com sucesso.');

        console.log('Importando dados de notícias...');
        const postsComAutor = postsData.map(post => ({
            ...post,
            autorId: adminUser.id,
            autorNome: adminUser.nome
        }));
        await db.Post.bulkCreate(postsComAutor, { validate: true });
        console.log('✅ Notícias importadas com sucesso.');

        console.log('\n=====================================');
        console.log('🚀 Configuração do banco de dados concluída!');
        console.log('=====================================');

    } catch (error) {
        console.error('❌ Erro durante a configuração do banco de dados:', error);
    } finally {
        if (db.sequelize) {
            await db.sequelize.close();
        }
    }
};

setupDatabase();