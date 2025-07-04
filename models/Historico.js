const mongoose = require('mongoose');

const HistoricoSchema = new mongoose.Schema({
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Referência ao seu modelo de Usuário
        required: true,
    },
    anime: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Anime', // Referência ao seu modelo de Anime
        required: true,
    },
    ultimoEpisodioAssistido: {
        numero: { type: Number, required: true },
        titulo: { type: String, required: true },
    },
}, {
    timestamps: true // Adiciona `createdAt` e `updatedAt` automaticamente
});

// Índice para garantir que um usuário tenha apenas UMA entrada por anime, evitando duplicatas.
HistoricoSchema.index({ usuario: 1, anime: 1 }, { unique: true });

const Historico = mongoose.model('Historico', HistoricoSchema);

module.exports = Historico;