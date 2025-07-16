// ====================================================================================
//              DenyAnimeHub - Serviço de Notificação por E-mail (Versão Simplificada)
// ====================================================================================
'use strict';
const db = require('../models');
const sendEmail = require('../utils/sendEmail');
const ejs = require('ejs');
const path = require('path');

/**
 * Envia notificações por e-mail para TODOS os usuários sobre novos animes ou episódios.
 * @param {object} anime - A instância do modelo Anime.
 * @param {object|null} episodio - A instância do modelo Episodio (opcional).
 */
const sendNotification = async (anime, episodio = null) => {
    console.log("--- INICIANDO PROCESSO DE NOTIFICAÇÃO EM MASSA ---");
    if (!anime || !anime.titulo) {
        console.error("ERRO DE NOTIFICAÇÃO: Objeto 'anime' inválido ou sem título.");
        return;
    }
    console.log("Anime:", anime.titulo);
    if (episodio) console.log("Episódio:", episodio.numero);

    try {
        // [MUDANÇA CRUCIAL] Busca TODOS os usuários, sem filtrar por 'receberNotificacoes'.
        const allUsers = await db.User.findAll({
            attributes: ['email']
        });

        if (allUsers.length === 0) {
            console.log("--- PROCESSO DE NOTIFICAÇÃO ENCERRADO (SEM USUÁRIOS REGISTRADOS) ---");
            return;
        }

        const emails = allUsers.map(user => user.email);
        const tipoNotificacao = episodio ? 'Novo Episódio Disponível' : 'Novo Anime Adicionado';
        
        const urlDestino = episodio
            ? `${process.env.APP_URL}/assistir/${anime.slug}/${episodio.id}`
            : `${process.env.APP_URL}/anime/${anime.slug}`;
        
        if (!process.env.APP_URL) {
            console.error("ERRO GRAVE: A variável de ambiente APP_URL não está definida! As URLs nos e-mails estarão quebradas.");
        }

        const emailHtml = await ejs.renderFile(
            path.join(__dirname, '../views/email/notificacaoAnime.ejs'),
            { anime, episodio, tipoNotificacao, urlDestino }
        );

        console.log(`Preparando para enviar notificação para ${emails.length} e-mails...`);

        // Envia um único e-mail para múltiplos destinatários usando o campo 'bcc' (Cópia Carbono Oculta)
        await sendEmail({
            to: process.env.EMAIL_USERNAME, // Envia para sua própria conta como registro
            bcc: emails, // Coloca todos os usuários em cópia oculta
            subject: `🔥 ${tipoNotificacao}: ${anime.titulo}`,
            html: emailHtml
        });

        console.log(`--- SUCESSO! Notificação enviada para ${emails.length} usuários. ---`);

    } catch (error) {
        console.error("!!! ERRO NO SERVIÇO DE NOTIFICAÇÃO:", error);
    }
};

module.exports = { sendNotification };