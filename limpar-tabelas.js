// ====================================================================================
//
//              DenyAnimeHub - Script de Preparação de Ambiente (Versão Definitiva)
//
// Descrição:     Este script se conecta ao PostgreSQL, CRIA o banco de dados se
//                ele não existir, e então apaga as tabelas para garantir uma
//                sincronização limpa. É a solução completa.
//
// Como usar:     1. Garanta que o serviço PostgreSQL está rodando.
//                2. Execute no terminal: node preparar-banco.js
//
// ====================================================================================

'use strict';

const { Sequelize } = require('sequelize');
const pg = require('pg');
const path = require('path');
const env = process.env.NODE_ENV || 'development';
const config = require(path.join(__dirname, 'config', 'config.json'))[env];

// Validação crítica da senha
if (!config.password || config.password === 'SUA_SENHA_AQUI') {
    console.error("\n❌ ERRO CRÍTICO: Senha do banco de dados não foi definida!");
    console.error("Por favor, edite o arquivo '/config/config.json' e substitua 'SUA_SENHA_AQUI' pela sua senha real do PostgreSQL.\n");
    process.exit(1);
}

const prepararAmbiente = async () => {
  const { database, username, password, host, port } = config;

  // Conexão inicial ao servidor PostgreSQL, mas SEM especificar um banco de dados
  const pool = new pg.Pool({
    user: username,
    password: password,
    host: host,
    port: port || 5432,
    database: 'postgres' // Conectamos ao DB padrão 'postgres' para poder criar o nosso
  });

  try {
    console.log(`🔌 Conectando ao servidor PostgreSQL em '${host}'...`);
    const client = await pool.connect();
    console.log('✅ Conexão ao servidor bem-sucedida.');

    const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = '${database}'`);
    if (res.rowCount === 0) {
      console.log(`🗂️  Banco de dados "${database}" não encontrado. Criando...`);
      await client.query(`CREATE DATABASE "${database}"`);
      console.log(`✅ Banco de dados "${database}" criado com sucesso.`);
    } else {
      console.log(`🗂️  Banco de dados "${database}" já existe.`);
    }
    client.release();
    await pool.end();

    // Agora, conectamos ao DB do projeto para limpar as tabelas
    const sequelize = new Sequelize(database, username, password, { host, port, dialect: 'postgres', logging: false });
    
    console.log(`🔌 Reconectando ao banco de dados "${database}" para limpeza...`);
    await sequelize.authenticate();
    console.log('✅ Conexão para limpeza bem-sucedida.');
    
    console.log("🔥 Apagando tabelas antigas para garantir uma fundação limpa...");
    await sequelize.query('DROP TABLE IF EXISTS "ratings" CASCADE;');
    await sequelize.query('DROP TABLE IF EXISTS "comments" CASCADE;');
    await sequelize.query('DROP TABLE IF EXISTS "historicos" CASCADE;');
    console.log("✅ Tabelas antigas apagadas com sucesso.");

    console.log('\n✨ Processo de preparação concluído! Você já pode iniciar seu servidor principal com "npm start".');
    await sequelize.close();
    console.log('🔌 Conexão final com o banco de dados fechada.');

  } catch (error) {
    console.error('❌ Erro durante a preparação do ambiente:', error);
    if (error.name === 'SequelizeConnectionRefusedError' || error.code === 'ECONNREFUSED') {
        console.error('\nDICA: O erro "ECONNREFUSED" significa que o seu servidor PostgreSQL não está rodando. Verifique se o serviço do PostgreSQL está ativo no seu computador.');
    } else if (error.code === '28P01') {
        console.error('\nDICA: O erro "password authentication failed" significa que a senha em "/config/config.json" está incorreta.');
    } else {
        console.error('\nDICA: Um erro inesperado ocorreu. Verifique as configurações de conexão e se o banco de dados não está bloqueado.');
    }
  }
};

prepararAmbiente();