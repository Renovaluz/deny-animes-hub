// ==================================================================================================
//
//              DenyAnimeHub - Controller: Gerenciamento de Episódios (Versão Definitiva)
//
// Versão:        3.0 (Final e Robusta)
// Descrição:     Este controller gerencia toda a lógica de CRUD para os episódios.
//                Esta versão inclui validações rigorosas, impede a criação de episódios duplicados,
//                gerencia de forma segura a exclusão de arquivos físicos e trata erros para
//                evitar arquivos órfãos no servidor. O código está completo, sem omissões
//                e documentado para máxima clareza.
//
// ==================================================================================================

'use strict';

const db = require('../models');
const { convertToEmbedUrl } = require('../utils/linkConverter.js');
const fs = require('fs').promises; // Usando a versão de Promises do FS para async/await
const path = require('path');

const episodioController = {};

/**
 * Deleta de forma segura um arquivo de vídeo físico do servidor.
 * Não deleta arquivos padrão e trata erros de forma silenciosa no log.
 * @param {string} filePath - O caminho relativo do arquivo a ser deletado (ex: /uploads/videos/video.mp4).
 */
const deletarArquivoDeVideo = async (filePath) => {
    // Garante que o caminho existe e não é um arquivo de fallback padrão
    if (!filePath || filePath.includes('default-') || !filePath.startsWith('/uploads/videos/')) {
        return;
    }

    try {
        const fullPath = path.join(__dirname, '..', 'public', filePath);
        await fs.unlink(fullPath);
        console.log(`[Episodio Controller] Arquivo de vídeo deletado com sucesso: ${fullPath}`);
    } catch (err) {
        // Se o erro for "arquivo não encontrado", pode ser ignorado. Outros erros são logados.
        if (err.code !== 'ENOENT') {
            console.error(`[Episodio Controller] Falha ao deletar arquivo de vídeo físico: ${filePath}`, err);
        }
    }
};

/**
 * @route   POST /api/episodios
 * @desc    Cria um novo episódio a partir de um link externo (Gdrive, etc.).
 * @access  Admin
 */
episodioController.createEpisodioViaLink = async (req, res) => {
    try {
        const { animeId, numero, titulo, urlVideo, tipoVideo, temporada } = req.body;
        const numEpisodio = parseInt(numero, 10);
        const numTemporada = parseInt(temporada, 10);
        const idAnime = parseInt(animeId, 10);

        // --- 1. Validação Robusta de Entrada ---
        if (!idAnime || !numEpisodio || !numTemporada || !tipoVideo || !urlVideo) {
            return res.status(400).json({ success: false, error: 'Dados essenciais do episódio estão faltando (animeId, numero, temporada, tipoVideo, urlVideo).' });
        }

        // --- 2. Prevenção de Duplicatas ---
        const existingEpisodio = await db.Episodio.findOne({
            where: { animeId: idAnime, numero: numEpisodio, temporada: numTemporada }
        });

        if (existingEpisodio) {
            return res.status(409).json({ success: false, error: `Conflito: O episódio ${numEpisodio} da temporada ${numTemporada} para este anime já existe.` });
        }

        // --- 3. Conversão e Validação da URL ---
        const finalUrl = convertToEmbedUrl(urlVideo, tipoVideo);
        if (!finalUrl) {
            return res.status(400).json({ success: false, error: 'URL fornecida é inválida ou não pôde ser convertida para o tipo de vídeo selecionado.' });
        }

        // --- 4. Criação no Banco de Dados ---
        const novoEpisodio = await db.Episodio.create({
            animeId: idAnime,
            numero: numEpisodio,
            titulo: titulo || null,
            urlVideo: finalUrl,
            tipoVideo: tipoVideo,
            temporada: numTemporada
        });

        res.status(201).json({ success: true, data: novoEpisodio });

    } catch (error) {
        console.error("[Episodio Controller] Erro ao criar episódio via link:", error);
        res.status(500).json({ success: false, error: 'Erro interno no servidor ao processar sua solicitação.' });
    }
};

/**
 * @route   POST /api/episodios/upload
 * @desc    Cria um novo episódio a partir de um upload de arquivo.
 * @access  Admin
 */
episodioController.createEpisodioComUpload = async (req, res) => {
    const filePath = req.file ? `/uploads/videos/${req.file.filename}` : null;

    try {
        const { animeId, numero, titulo, temporada } = req.body;
        const numEpisodio = parseInt(numero, 10);
        const numTemporada = parseInt(temporada, 10);
        const idAnime = parseInt(animeId, 10);

        // --- 1. Validação Robusta de Entrada ---
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Nenhum arquivo de vídeo foi enviado.' });
        }
        if (!idAnime || !numEpisodio || !numTemporada) {
            return res.status(400).json({ success: false, error: 'Dados essenciais do episódio estão faltando (animeId, numero, temporada).' });
        }

        // --- 2. Prevenção de Duplicatas ---
        const existingEpisodio = await db.Episodio.findOne({
            where: { animeId: idAnime, numero: numEpisodio, temporada: numTemporada }
        });

        if (existingEpisodio) {
            // Se o episódio já existe, o arquivo que acabamos de enviar é órfão e deve ser deletado.
            await deletarArquivoDeVideo(filePath);
            return res.status(409).json({ success: false, error: `Conflito: O episódio ${numEpisodio} da temporada ${numTemporada} para este anime já existe.` });
        }

        // --- 3. Criação no Banco de Dados ---
        const novoEpisodio = await db.Episodio.create({
            animeId: idAnime,
            numero: numEpisodio,
            titulo: titulo || null,
            urlVideo: filePath,
            tipoVideo: 'upload',
            temporada: numTemporada
        });

        res.status(201).json({ success: true, data: novoEpisodio });

    } catch (error) {
        console.error("[Episodio Controller] Erro ao criar episódio via upload:", error);
        // Se ocorrer um erro durante a criação no BD, o arquivo enviado deve ser removido para não ficar órfão.
        if (filePath) {
            await deletarArquivoDeVideo(filePath);
        }
        res.status(500).json({ success: false, error: 'Erro interno no servidor ao criar episódio.' });
    }
};

/**
 * @route   DELETE /api/episodios/:id
 * @desc    Deleta um episódio específico.
 * @access  Admin
 */
episodioController.deleteEpisodio = async (req, res) => {
    try {
        const { id } = req.params;
        const episodio = await db.Episodio.findByPk(id);

        if (!episodio) {
            return res.status(404).json({ success: false, error: 'Episódio não encontrado.' });
        }

        // Se o episódio foi um upload, deleta o arquivo físico ANTES de remover o registro do BD.
        if (episodio.tipoVideo === 'upload') {
            await deletarArquivoDeVideo(episodio.urlVideo);
        }

        await episodio.destroy();
        
        console.log(`[Episodio Controller] Episódio ID ${id} deletado com sucesso.`);
        res.status(200).json({ success: true, message: 'Episódio deletado com sucesso.' });

    } catch (error) {
        console.error(`[Episodio Controller] Erro ao deletar episódio ID (${req.params.id}):`, error);
        res.status(500).json({ success: false, error: 'Ocorreu um erro no servidor ao deletar o episódio.' });
    }
};

module.exports = episodioController;