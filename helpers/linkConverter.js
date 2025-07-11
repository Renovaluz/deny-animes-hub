// ====================================================================================
//
//              DenyAnimeHub - Helper: Conversor de Links (Versão Infinite Tsukuyomi)
//
// Versão:        3.0 (Final e Definitiva)
// Descrição:     Converte links de compartilhamento do Google Drive na URL de download
//                exata que força a tela de confirmação de download, como solicitado.
//
// ====================================================================================

'use strict';

/**
 * Converte uma URL de compartilhamento na URL apropriada para embed ou download.
 * @param {string} url A URL original de compartilhamento.
 * @param {string} type O tipo de serviço (gdrive, mega, etc.).
 * @returns {string|null} A URL processada ou null se a URL for inválida.
 */
function convertToEmbedUrl(url, type) {
    if (!url || typeof url !== 'string') {
        console.error("[linkConverter] URL inválida ou nula fornecida.");
        return null;
    }

    try {
        // --- LÓGICA MESTRE PARA GOOGLE DRIVE ---
        if (type === 'gdrive') {
            // Expressão regular robusta para extrair o ID do arquivo de qualquer formato de URL do Google Drive.
            const regex = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=|drive\/folders\/))([a-zA-Z0-9_-]{25,})/;
            const match = url.match(regex);
            
            if (match && match[1]) {
                const fileId = match[1];
                
                // >>>>> A URL PERFEITA E FINAL, EXATAMENTE COMO VOCÊ PEDIU <<<<<
                // Ela levará o usuário para a tela de download do Google Drive.
                return `https://drive.usercontent.google.com/download?id=${fileId}&export=download&authuser=0`;
            }
            
            // Se não encontrar um ID válido, loga um aviso e retorna a URL original para evitar quebrar o sistema.
            console.warn(`[linkConverter] Não foi possível extrair um ID de arquivo válido da URL do Google Drive: ${url}`);
            return url;
        }

        // --- Lógica para outros serviços (mantida para futura expansão) ---
        if (type === 'mega' && url.includes('/file/')) {
            // Para Mega, o embed é a melhor opção para o player.
            return url.replace('/file/', '/embed/');
        }
        
        if (type === 'mediafire') {
            // MediaFire é complexo, a melhor abordagem é o link direto para a página.
            return url;
        }

    } catch (error) {
        console.error(`[linkConverter] Falha crítica ao converter URL do tipo ${type}:`, error);
        return url; // Retorna a URL original como fallback em caso de erro.
    }

    // Para 'iframe' ou qualquer outro tipo não especificado, retorna a URL original sem modificação.
    return url;
}

module.exports = { convertToEmbedUrl };