// ====================================================================================
//
//              DenyAnimeHub - Script de Migração de Banco (NÃO-DESTRUTIVO)
//
// Descrição:     Esta versão definitiva inclui a configuração SSL correta,
//                resolvendo erros de 'ECONNRESET'. Ele lê a configuração do
//                ambiente (development/production) e se adapta automaticamente.
//
// Como usar:     1. Garanta que seu serviço de DB (local ou remoto) esteja rodando.
//                2. Execute no terminal: node migrar-banco.js
//                (Para produção, defina NODE_ENV=production antes de rodar)
//
// ====================================================================================

'use strict';

const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// Determina o ambiente. Se NODE_ENV não estiver definido, assume 'development'.
const env = process.env.NODE_ENV || 'development';
const config = require(path.join(__dirname, 'config', 'config.json'))[env];

// Validação crítica para garantir que as senhas padrão não sejam usadas.
if (config.password === 'SUA_SENHA_AQUI' || !config.password) {
    console.error(`\n❌ ERRO CRÍTICO: Senha para o ambiente '${env}' não foi definida!`);
    console.error("Por favor, edite o arquivo '/config/config.json' e defina a senha correta.\n");
    process.exit(1);
}

// [CORREÇÃO DEFINITIVA] A instância do Sequelize agora inclui as dialectOptions
// do config.json, que são cruciais para a conexão com serviços como o Render.
const sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    dialect: config.dialect,
    dialectOptions: config.dialectOptions || {}, // Adiciona as opções de dialeto (SSL) se existirem
    logging: false // Desativa o log do Sequelize para um output mais limpo
});

/**
 * Função segura para adicionar uma coluna a uma tabela apenas se ela não existir.
 * @param {object} queryInterface - A interface de query do Sequelize.
 * @param {string} tableName - O nome da tabela.
 * @param {string} columnName - O nome da coluna a ser adicionada.
 * @param {object} columnDefinition - A definição da coluna no formato do Sequelize.
 */
const adicionarColunaSeNaoExistir = async (queryInterface, tableName, columnName, columnDefinition) => {
    try {
        const tableDescription = await queryInterface.describeTable(tableName);

        if (!tableDescription[columnName]) {
            console.log(`🔎 Coluna "${columnName}" não encontrada na tabela "${tableName}". Adicionando...`);
            await queryInterface.addColumn(tableName, columnName, columnDefinition);
            console.log(`✅ Coluna "${columnName}" adicionada com sucesso à tabela "${tableName}".`);
        } else {
            console.log(`👍 Coluna "${columnName}" já existe na tabela "${tableName}". Nenhuma ação necessária.`);
        }
    } catch (error) {
        // Se a tabela em si não existir, o Sequelize a criará na inicialização do app.
        // Acessa o código de erro de forma segura, seja em `error.original` ou `error.parent`.
        const errorCode = error.original?.code || error.parent?.code;
        if (error.name === 'SequelizeDatabaseError' && errorCode === '42P01') {
             console.log(`⚠️  Tabela "${tableName}" não existe ainda. O Sequelize irá criá-la na próxima inicialização do seu app.`);
        } else {
            // Re-lança outros erros para serem pegos pelo bloco principal
            throw error;
        }
    }
};

/**
 * Função principal que executa a migração do banco de dados.
 */
const migrarBanco = async () => {
  try {
    console.log(`🔌 Conectando ao banco de dados do ambiente: [${env.toUpperCase()}]...`);
    await sequelize.authenticate();
    console.log('✅ Conexão bem-sucedida.');
    
    // Pega a interface de query para manipular a estrutura do banco
    const queryInterface = sequelize.getQueryInterface();
    
    console.log('\n--- INICIANDO VERIFICAÇÃO DA ESTRUTURA DO BANCO ---');

    // =========================================================================
    //      ADICIONA A COLUNA 'receberNotificacoes' NA TABELA 'users'
    // =========================================================================
    await adicionarColunaSeNaoExistir(
        'users', 
        'receberNotificacoes', 
        { 
            type: DataTypes.BOOLEAN, 
            allowNull: false, 
            defaultValue: true 
        }
    );
    
    // Adicione futuras migrações aqui, se necessário.
    
    console.log('\n✨ Processo de migração concluído! A estrutura do seu banco de dados está atualizada.');
    console.log('Pode iniciar seu servidor com "npm start".');

  } catch (error) {
    console.error('❌ Erro durante a migração do banco:', error);
    if (error.name === 'SequelizeConnectionResetError' || error.original?.code === 'ECONNRESET') {
        console.error('\nDICA: O erro "ECONNRESET" geralmente indica um problema de conexão SSL. Verifique se as `dialectOptions` no seu `config.json` estão corretas para o seu provedor de banco de dados (ex: Render).');
    } else if (error.name === 'SequelizeConnectionError') {
        console.error('\nDICA: Verifique suas credenciais (usuário, senha, nome do banco, host) em "/config/config.json" e se o servidor de banco de dados está acessível.');
    } else {
        console.error('\nDICA: Um erro inesperado ocorreu. Verifique a mensagem de erro acima para mais detalhes.');
    }
  } finally {
    // Garante que a conexão seja sempre fechada
    await sequelize.close();
    console.log('🔌 Conexão com o banco de dados fechada.');
  }
};

// Executa a função principal de migração
migrarBanco();