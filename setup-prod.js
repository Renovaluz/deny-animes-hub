require('dotenv').config();
const db = require('./models');

// Dados de exemplo para popular o banco
const animesParaCriar = [
    { titulo: "Naruto Shippuden", sinopse: "A jornada de Naruto Uzumaki...", anoLancamento: 2007, imagemCapa: "/images/placeholder.jpg", generos: ["Ação", "Aventura"] },
    { titulo: "Attack on Titan", sinopse: "Humanidade luta contra titãs...", anoLancamento: 2013, imagemCapa: "/images/placeholder.jpg", generos: ["Ação", "Dark Fantasy"] }
];

const postsParaCriar = [
    { titulo: "Nova Temporada Anunciada!", conteudo: "Detalhes sobre a nova temporada de um anime popular..." },
    { titulo: "Top 10 Lutas Inesquecíveis", conteudo: "Uma lista das melhores lutas dos animes..." }
];

const setupProduction = async () => {
    try {
        console.log('Conectando ao banco de dados de produção...');
        await db.sequelize.sync({ force: true }); // CUIDADO: `force: true` apaga tudo! Use apenas na primeira vez.
        console.log('✅ Tabelas sincronizadas.');

        console.log('Criando usuário admin...');
        const adminUser = await db.User.create({
            nome: 'Admin Akatsuki',
            email: 'admin@denyanimehub.com',
            senha: 'password123', // Senha será criptografada pelo hook
            role: 'admin'
        });
        console.log(`✅ Usuário admin criado: ${adminUser.email}`);

        console.log('Criando animes de exemplo...');
        await db.Anime.bulkCreate(animesParaCriar);
        console.log('✅ Animes de exemplo criados.');

        console.log('Criando posts de exemplo...');
        const postsComAutor = postsParaCriar.map(p => ({ ...p, autorId: adminUser.id, autorNome: adminUser.nome }));
        await db.Post.bulkCreate(postsComAutor);
        console.log('✅ Posts de exemplo criados.');

        console.log('\n🚀 SETUP DE PRODUÇÃO CONCLUÍDO COM SUCESSO! 🚀');

    } catch (error) {
        console.error('❌ Erro durante o setup de produção:', error);
    } finally {
        await db.sequelize.close();
    }
};

setupProduction();