// ====================================================================================
//
//              DenyAnimeHub - Controller: Episódios
//
// Versão:        2.0 (Titan)
// Descrição:     Este controller é dedicado exclusivamente à lógica de negócios
//                para os episódios. Ele lida com a criação e exclusão de episódios,
//                garantindo que todos os dados sejam validados antes de serem
//                inseridos no banco de dados e que as operações sejam seguras.
//
// ====================================================================================

'use strict';
const { Episodio } = require('../models');

/**
 * Cria um novo episódio e o associa a um anime.
 * @route POST /api/episodios
 */
exports.createEpisodio = async (req, res) => {
    try {
        const { animeId, numero, titulo, urlVideo, tipoVideo, temporada } = req.body;

        // --- Validação de Entrada Rigorosa ---
        if (!animeId || !numero || !temporada || !tipoVideo) {
            return res.status(400).json({ success: false, error: 'Dados essenciais do episódio (animeId, numero, temporada, tipoVideo) estão faltando.' });
        }
        if (isNaN(parseInt(numero, 10)) || parseInt(numero, 10) < 0) {
             return res.status(400).json({ success: false, error: 'O número do episódio deve ser um número válido e não negativo.' });
        }
        // Se não for um upload, a URL é obrigatória.
        if (tipoVideo !== 'upload' && (!urlVideo || urlVideo.trim() === '')) {
            return res.status(400).json({ success: false, error: 'A URL do vídeo é obrigatória para este tipo de fonte.' });
        }
        // Se for upload, a URL (caminho do arquivo) deve ter sido fornecida.
        if (tipoVideo === 'upload' && !urlVideo) {
            return res.status(400).json({ success: false, error: 'Ocorreu uma falha no upload. O caminho do arquivo não foi recebido.' });
        }

        // Verifica se um episódio com o mesmo número e temporada já existe para este anime.
        const existingEpisode = await Episodio.findOne({
            where: {
                animeId: animeId,
                numero: numero,
                temporada: temporada
            }
        });
        
        if (existingEpisode) {
            return res.status(409).json({ success: false, error: `Conflito: O episódio ${numero} da temporada ${temporada} já existe para este anime.` });
        }

        const novoEpisodio = await Episodio.create({
            animeId: parseInt(animeId, 10),
            numero: parseInt(numero, 10),
            titulo: titulo || null,
            urlVideo: urlVideo,
            tipoVideo: tipoVideo,
            temporada: parseInt(temporada, 10)
        });

        console.log(`[Episodio Controller] Episódio criado com sucesso: ID ${novoEpisodio.id} para o Anime ID ${animeId}`);
        res.status(201).json({ success: true, data: novoEpisodio });

    } catch (error) {
        console.error("[Episodio Controller] Erro ao criar episódio:", error);
        res.status(500).json({ success: false, error: 'Ocorreu um erro inesperado no servidor ao criar o episódio.' });
    }
};

/**
 * Deleta um episódio do banco de dados pelo seu ID.
 * @route DELETE /api/episodios/:id
 */
exports.deleteEpisodio = async (req, res) => {
    try {
        const { id } = req.params;
        if (isNaN(parseInt(id, 10))) {
            return res.status(400).json({ success: false, error: 'ID de episódio inválido.' });
        }

        const deletedRows = await Episodio.destroy({ where: { id: id } });

        if (deletedRows === 0) {
            return res.status(404).json({ success: false, error: 'Episódio não encontrado.' });
        }

        console.log(`[Episodio Controller] Episódio deletado com sucesso: ID ${id}`);
        res.status(200).json({ success: true, message: 'Episódio deletado com sucesso.' });
    } catch (error) {
        console.error(`[Episodio Controller] Erro ao deletar episódio ID (${req.params.id}):`, error);
        res.status(500).json({ success: false, error: 'Ocorreu um erro no servidor ao deletar o episódio.' });
    }
};