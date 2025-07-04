const { Sequelize } = require('sequelize');
require('dotenv').config();

// Cria uma instância do Sequelize com as configurações do arquivo .env
const sequelize = new Sequelize(
  process.env.DB_DATABASE, // Nome do banco de dados
  process.env.DB_USER,     // Usuário
  process.env.DB_PASSWORD, // Senha
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT, // 'mysql'
    logging: false, // Desativa os logs SQL no console. Mude para console.log para ver as queries.
  }
);

// Testa a conexão
const testDbConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Conexão com o banco de dados SQL estabelecida com sucesso.');
    } catch (error) {
        console.error('❌ Não foi possível conectar ao banco de dados SQL:', error);
    }
};

testDbConnection();

module.exports = sequelize;