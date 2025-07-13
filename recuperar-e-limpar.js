// ====================================================================================
//
//              DenyAnimeHub - Script Mestre de Recuperação e Limpeza
//
// Descrição:     Este script automatiza o processo de resetar a senha do superusuário
//                'postgres' e, em seguida, limpa as tabelas da aplicação.
//
// ATENÇÃO:       ESTE SCRIPT PRECISA SER EXECUTADO COM PRIVILÉGIOS DE ADMINISTRADOR.
//
// Como usar:     1. Abra um terminal (CMD ou PowerShell) COMO ADMINISTRADOR.
//                2. Navegue até a pasta do projeto.
//                3. Execute o comando: node recuperar-e-limpar.js
//
// ====================================================================================

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');
const pg = require('pg');

// --- CONFIGURAÇÃO CRÍTICA ---
// Defina a NOVA senha que você quer usar para o PostgreSQL aqui.
const NOVA_SENHA_POSTGRES = 'ADMIN'; // Use uma senha simples para desenvolvimento local
const USUARIO_POSTGRES = 'postgres';

const env = process.env.NODE_ENV || 'development';
const config = require(path.join(__dirname, 'config', 'config.json'))[env];
const NOME_BANCO_DE_DADOS = config.database;


// Função para executar comandos no shell e mostrar a saída
const executarComando = (comando, ignoreError = false) => {
    try {
        console.log(`\n> Executando: ${comando}`);
        const saida = execSync(comando, { stdio: 'pipe' }).toString();
        console.log(saida);
        return true;
    } catch (error) {
        console.error(`❌ Falha ao executar comando: ${comando}`);
        console.error(error.message);
        if (!ignoreError) process.exit(1);
        return false;
    }
};

// Função principal do script
const run = async () => {
    console.log('--- INICIANDO PROCESSO DE RECUPERAÇÃO E LIMPEZA ---');

    // 1. Encontrar o caminho do PostgreSQL e o nome do serviço
    const pgBasePath = "C:\\Program Files\\PostgreSQL";
    const versoes = fs.readdirSync(pgBasePath).filter(f => /^\d+$/.test(f));
    if (versoes.length === 0) {
        console.error(`❌ Nenhuma instalação do PostgreSQL encontrada em ${pgBasePath}`);
        return;
    }
    const versao = versoes[0]; // Pega a primeira versão encontrada
    const pgDataPath = path.join(pgBasePath, versao, 'data');
    const pgHbaPath = path.join(pgDataPath, 'pg_hba.conf');
    const pgServiceName = `postgresql-x64-${versao}`;
    console.log(`✅ PostgreSQL v${versao} detectado.`);
    console.log(`   - Serviço: ${pgServiceName}`);
    console.log(`   - Arquivo de configuração: ${pgHbaPath}`);

    // 2. Parar o serviço do PostgreSQL
    executarComando(`sc stop ${pgServiceName}`, true); // Ignora erro se já estiver parado
    await new Promise(r => setTimeout(r, 2000)); // Espera para garantir que parou

    // 3. Modificar pg_hba.conf para 'trust'
    let hbaOriginal = '';
    try {
        console.log('🔄 Modificando pg_hba.conf para permitir acesso sem senha...');
        hbaOriginal = fs.readFileSync(pgHbaPath, 'utf8');
        const hbaModificado = hbaOriginal.replace(/scram-sha-256/g, 'trust').replace(/md5/g, 'trust');
        fs.writeFileSync(pgHbaPath, hbaModificado, 'utf8');
        console.log('✅ Arquivo modificado para "trust".');
    } catch (error) {
        console.error(`❌ Falha ao modificar pg_hba.conf. Verifique se o script está rodando como Administrador.`);
        return;
    }

    // 4. Iniciar o serviço do PostgreSQL
    executarComando(`sc start ${pgServiceName}`);
    await new Promise(r => setTimeout(r, 3000)); // Espera para o serviço iniciar

    // 5. Conectar e alterar a senha
    const poolConfSemSenha = { user: USUARIO_POSTGRES, host: config.host, database: 'postgres', password: null, port: config.port || 5432 };
    const pool = new pg.Pool(poolConfSemSenha);

    try {
        const client = await pool.connect();
        console.log(`🔑 Alterando a senha do usuário "${USUARIO_POSTGRES}" para "${NOVA_SENHA_POSTGRES}"...`);
        await client.query(`ALTER USER ${USUARIO_POSTGRES} WITH PASSWORD '${NOVA_SENHA_POSTGRES}';`);
        console.log('✅ Senha alterada com sucesso!');
        client.release();
    } catch(error) {
        console.error('❌ Falha ao alterar a senha.', error);
    } finally {
        await pool.end();
    }

    // 6. Parar o serviço novamente para restaurar a segurança
    executarComando(`sc stop ${pgServiceName}`);
    await new Promise(r => setTimeout(r, 2000));

    // 7. Restaurar o pg_hba.conf original
    try {
        console.log('🔄 Restaurando pg_hba.conf para o estado original e seguro...');
        fs.writeFileSync(pgHbaPath, hbaOriginal, 'utf8');
        console.log('✅ Arquivo restaurado.');
    } catch(error) {
        console.error('❌ Falha ao restaurar pg_hba.conf.');
        return;
    }

    // 8. Iniciar o serviço pela última vez
    executarComando(`sc start ${pgServiceName}`);
    await new Promise(r => setTimeout(r, 3000));

    // 9. Conectar com a NOVA senha e limpar as tabelas
    console.log(`\n--- INICIANDO PROCESSO DE LIMPEZA COM A NOVA SENHA ---`);
    const sequelize = new Sequelize(NOME_BANCO_DE_DADOS, USUARIO_POSTGRES, NOVA_SENHA_POSTGRES, {
        host: config.host,
        dialect: 'postgres',
        logging: false
    });
    
    try {
        await sequelize.authenticate();
        console.log(`✅ Conexão ao banco "${NOME_BANCO_DE_DADOS}" com a nova senha bem-sucedida.`);
        
        console.log("🔥 Apagando tabelas...");
        await sequelize.query('DROP TABLE IF EXISTS "ratings" CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS "comments" CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS "historicos" CASCADE;');
        console.log("✅ Tabelas antigas apagadas com sucesso.");

    } catch(error) {
        console.error("❌ Falha na fase de limpeza. Verifique suas configurações.", error);
    } finally {
        await sequelize.close();
    }

    console.log(`\n✨ PROCESSO CONCLUÍDO! Sua senha agora é "${NOVA_SENHA_POSTGRES}". Atualize seu config.json e inicie o servidor com "npm start".`);
};

run();