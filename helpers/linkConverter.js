// ==================================================================================================
//
//              DenyAnimeHub - Helper: Conversor de Links (Versão Mangekyō Sharingan)
//
// Versão:        4.0 (Final e Definitiva)
// Descrição:     Esta versão corrige a falha crítica que impedia a visualização de vídeos do
//                Google Drive. A lógica foi alterada para gerar a URL de "preview", que é
//                a URL correta e forçada para funcionar dentro de um <iframe>, eliminando
//                o erro "necessita de acesso". O código está completo, sem omissões e
//                extensivamente documentado para clareza e manutenção futura.
//
// ==================================================================================================

'use strict';

/**
 * Converte uma URL de compartilhamento na URL apropriada para ser embutida em um player.
 * A função é robusta e lida especificamente com a complexidade dos links do Google Drive.
 * 
 * @param {string} url - A URL original de compartilhamento fornecida pelo administrador.
 * @param {string} type - O tipo de serviço (ex: 'gdrive', 'mega', 'iframe').
 * @returns {string|null} A URL processada e pronta para o player, ou null se a URL for inválida.
 */
function convertToEmbedUrl(url, type) {
    // Validação de entrada: Garante que a URL não é nula, indefinida ou não é uma string.
    if (!url || typeof url !== 'string') {
        console.error("[linkConverter] ERRO: URL inválida ou nula fornecida. Não é possível converter.");
        return null;
    }

    try {
        // --- LÓGICA MESTRE PARA GOOGLE DRIVE (CORRIGIDA E FINAL) ---
        if (type === 'gdrive') {
            
            // Esta expressão regular é a chave para a robustez. Ela captura o ID do arquivo
            // de múltiplos formatos de links do Google Drive:
            // - drive.google.com/file/d/FILE_ID/view
            // - drive.google.com/open?id=FILE_ID
            // - drive.google.com/drive/folders/FILE_ID (embora menos comum para arquivos)
            const regex = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=|drive\/folders\/))([a-zA-Z0-9_-]{25,})/;
            const match = url.match(regex);
            
            // Verifica se a regex encontrou um ID válido.
            if (match && match[1]) {
                const fileId = match[1];
                
                // >>>>> A CORREÇÃO CRÍTICA E DEFINITIVA <<<<<
                // Em vez de gerar um link de DOWNLOAD, geramos a URL de PREVIEW.
                // A URL de /preview é a única que o Google Drive permite ser embutida
                // em um <iframe> em outros sites, resolvendo o problema de permissão.
                const embeddableUrl = `https://drive.google.com/file/d/${fileId}/preview`;
                
                console.log(`[linkConverter] INFO: Link do Google Drive convertido com sucesso para visualização: ${embeddableUrl}`);
                return embeddableUrl;
            }
            
            // Se a regex falhar, significa que o link do GDrive está em um formato irreconhecível.
            // Logamos um aviso claro e retornamos a URL original para evitar quebrar o sistema.
            console.warn(`[linkConverter] AVISO: Não foi possível extrair um ID de arquivo válido da URL do Google Drive fornecida: ${url}`);
            return url;
        }

        // --- Lógica para outros serviços (mantida para futura expansão) ---
        
        // Converte links do Mega.nz para o formato de embed.
        if (type === 'mega' && url.includes('/file/')) {
            return url.replace('/file/', '/embed/');
        }
        
        // Links do MediaFire não possuem um formato de embed confiável, então usamos o link direto.
        if (type === 'mediafire') {
            return url;
        }

    } catch (error) {
        // Captura qualquer erro inesperado durante o processamento da string.
        console.error(`[linkConverter] ERRO CRÍTICO: Falha ao tentar converter a URL do tipo '${type}':`, error);
        // Retorna a URL original como um fallback seguro para não interromper a execução.
        return url;
    }

    // Para o tipo 'iframe' ou qualquer outro tipo não especificado, assume-se que a URL
    // já está no formato correto para ser embutida. Retorna a URL original sem modificação.
    return url;
}

// Exporta a função para que ela possa ser importada e utilizada em outros
// arquivos do seu projeto, como nos seus controllers ou diretamente no EJS.
module.exports = {
    convertToEmbedUrl
};