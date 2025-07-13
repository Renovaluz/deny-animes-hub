const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // 1. Criar um "transportador" (o serviço que vai enviar o email, como Gmail, SendGrid, etc.)
    const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD
        }
    });

    // 2. Definir as opções do email (quem envia, para quem, assunto, corpo)
    const mailOptions = {
        from: `DenyAnimeHub <${process.env.EMAIL_FROM}>`,
        to: options.email,
        subject: options.subject,
        html: options.message
    };

    // 3. Enviar o email
    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;