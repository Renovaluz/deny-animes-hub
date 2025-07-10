// ====================================================================================
//
//              DenyAnimeHub - Utilitário: Gerador de Slug
//
// Versão:        1.0 (Final)
// Descrição:     Esta função é essencial para SEO e URLs amigáveis. Ela converte
//                qualquer string de texto (como um título de anime) em um formato
//                seguro para URLs, conhecido como "slug". Remove acentos, caracteres
//                especiais, converte para minúsculas, substitui espaços por hífens e
//                remove hífens duplicados. Um timestamp é adicionado ao final para
//                garantir que cada slug seja único no momento da criação.
//
// ====================================================================================

'use strict';

/**
 * Converte uma string de texto em um "slug" amigável para URLs.
 * @param {string} text - O texto a ser convertido (ex: "Naruto Shippūden!!").
 * @returns {string} O slug gerado (ex: "naruto-shippuden-1678886400000").
 */
function slugify(text) {
    if (typeof text !== 'string' || text.trim() === '') {
        // Retorna um slug genérico com timestamp se a entrada for inválida
        console.warn("[slugify] A entrada estava vazia ou não era uma string. Gerando slug genérico.");
        return `item-${Date.now()}`;
    }

    const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;';
    const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------';
    const p = new RegExp(a.split('').join('|'), 'g');

    const slug = text.toString().toLowerCase()
        .replace(/\s+/g, '-') // Substitui 1 ou mais espaços por um único -
        .replace(p, c => b.charAt(a.indexOf(c))) // Substitui caracteres especiais e acentuados
        .replace(/&/g, '-e-') // Substitui '&' por '-e-'
        .replace(/[^\w\-]+/g, '') // Remove todos os caracteres que não são letras, números, _ ou -
        .replace(/\-\-+/g, '-') // Substitui múltiplos - por um único -
        .replace(/^-+/, '') // Remove hífens do início do texto
        .replace(/-+$/, ''); // Remove hífens do final do texto

    // Se o slug ficar vazio após a limpeza, gera um slug genérico
    if (slug === '') {
        return `item-${Date.now()}`;
    }

    // Adiciona um timestamp para garantir que cada slug seja único, evitando colisões.
    return `${slug}-${Date.now()}`;
}

module.exports = slugify;