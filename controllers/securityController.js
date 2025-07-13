'use strict';
const sendEmail = require('../utils/sendEmail');

const securityController = {};

/**
 * @desc    Registra um evento de segurança e envia um alerta por e-mail.
 * @route   POST /api/security/log-event
 */
securityController.logSecurityEvent = async (req, res) => {
    try {
        const { eventType, userAgent, ip, pageUrl } = req.body;
        const user = req.user; // Obtido do middleware 'protegerOpcional'

        console.log(`[ALERTA DE SEGURANÇA] Evento: ${eventType} na página ${pageUrl}`);

        // Prepara a mensagem de e-mail para o admin
        const messageToAdmin = `
            <h1>🚨 ALERTA DE SEGURANÇA - DenyAnimeHub 🚨</h1>
            <p>Uma atividade suspeita foi detectada no seu site.</p>
            <h3>Detalhes do Evento:</h3>
            <ul>
                <li><strong>Tipo de Evento:</strong> ${eventType}</li>
                <li><strong>Página:</strong> ${pageUrl}</li>
                <li><strong>Endereço IP do Visitante:</strong> ${ip || req.ip}</li>
                <li><strong>User-Agent:</strong> ${userAgent}</li>
            </ul>
            <h3>Informações do Usuário (se logado):</h3>
            <ul>
                <li><strong>ID do Usuário:</strong> ${user ? user.id : 'Não logado'}</li>
                <li><strong>Nome:</strong> ${user ? user.nome : 'Não logado'}</li>
                <li><strong>Email:</strong> ${user ? user.email : 'Não logado'}</li>
            </ul>
            <p>Recomenda-se verificar a atividade deste IP.</p>
        `;

        // Envia o e-mail de alerta para você
        await sendEmail({
            email: 'denyneves14@gmail.com',
            subject: `[ALERTA URGENTE] Atividade Suspeita Detectada em DenyAnimeHub`,
            message: messageToAdmin
        });

        // Responde ao front-end para confirmar que o log foi recebido
        res.status(200).json({ success: true, message: 'Evento registrado.' });

    } catch (error) {
        console.error("Erro ao registrar evento de segurança:", error);
        // Responde com um erro, mas não revela detalhes internos
        res.status(500).json({ success: false, error: 'Erro interno no servidor.' });
    }
};

module.exports = securityController;