function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Substitui espaços por -
    .replace(/[^\w\-]+/g, '')       // Remove todos os caracteres não-palavra
    .replace(/\-\-+/g, '-')         // Substitui múltiplos - por um único -
    .replace(/^-+/, '')             // Remove - do início do texto
    .replace(/-+$/, '');            // Remove - do fim do texto
}

module.exports = slugify;