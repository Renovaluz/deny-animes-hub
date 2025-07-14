const db = require('../models');
const sendEmail = require('../utils/sendEmail');
const ejs = require('ejs');
const path = require('path');

// Função principal que dispara as notificações
const sendNotification = async (anime, episodio = null) => {
    try {
        // 1. Busca todos os usuários que optaram por receber notificações
        const subscribers = await db.User.findAll({
            where: { receberNotificacoes: true },
            attributes: ['email'] // Pega apenas o e-mail para ser mais eficiente
        });

        if (subscribers.length === 0) {
            console.log("Nenhum usuário inscrito para notificações.");
            return;
        }

        const emails = subscribers.map(user => user.email);

        // 2. Define o tipo de notificação e o link de destino
        const tipoNotificacao = episodio ? 'Novo Episódio Disponível' : 'Novo Anime Adicionado';
        const urlDestino = episodio
            ? `${process.env.APP_URL}/assistir/${anime.slug}/${episodio.id}`
            : `${process.env.APP_URL}/anime/${anime.slug}`;

        // 3. Renderiza o template EJS para HTML
        const emailHtml = await ejs.renderFile(
            path.join(__dirname, '../views/email/notificacaoAnime.ejs'),
            {
                anime,
                episodio,
                tipoNotificacao,
                urlDestino,
            }
        );

        // 4. Envia o e-mail para todos os inscritos
        await sendEmail({
            to: emails, // Nodemailer aceita um array de e-mails
            subject: `🔥 ${tipoNotificacao}: ${anime.titulo}`,
            html: emailHtml
        });

        console.log(`Notificação enviada com sucesso para ${emails.length} usuários.`);

    } catch (error) {
        console.error("Erro ao enviar notificação por e-mail:", error);
    }
};

module.exports = { sendNotification };

APP_URL=https://deny-animes-hub.onrender.com/

    // No topo do arquivo
    const { sendNotification } = require('../services/notificationService');

    // Dentro de `createAnime`
    exports.createAnime = async (req, res) => {
        try {
            // ... (toda a sua lógica de criação do anime)
            const newAnime = await db.Anime.create({ /* ...dados do anime... */ });

            // Dispara a notificação após o anime ser criado com sucesso
            // Usamos um 'setImmediate' para não bloquear a resposta da API
            setImmediate(() => {
                sendNotification(newAnime.get({ plain: true }));
            });

            res.status(201).json({ success: true, data: newAnime });
        } catch (error) {
            // ... (seu tratamento de erro)
        }
    };


    // No topo do arquivo
    const { sendNotification } = require('../services/notificationService');

    // Dentro de `createEpisodioViaLink` ou `createEpisodioComUpload`
    exports.createEpisodioViaLink = async (req, res) => {
        try {
            const { animeId, /* ...outros dados... */ } = req.body;
            const anime = await db.Anime.findByPk(animeId);

            if (!anime) {
                return res.status(404).json({ success: false, error: 'Anime não encontrado.' });
            }

            const newEpisodio = await db.Episodio.create({ /* ...dados do episódio... */ });

            // Dispara a notificação passando o anime e o novo episódio
            setImmediate(() => {
                sendNotification(anime.get({ plain: true }), newEpisodio.get({ plain: true }));
            });

            res.status(201).json({ success: true, data: newEpisodio });
        } catch (error) {
            // ... (seu tratamento de erro)
        }
    };