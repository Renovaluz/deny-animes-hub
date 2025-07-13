// ====================================================================================
//
//              DenyAnimeHub - Controller: Interações do Usuário
//
// Versão:        1.0
// Descrição:     Gerencia todas as interações da comunidade, como comentários
//                e classificações, garantindo a validação e a lógica de negócio.
//
// ====================================================================================

const db = require('../models');

// --- LÓGICA PARA BUSCAR COMENTÁRIOS ---
exports.getComments = async (req, res) => {
    try {
        const { animeId } = req.params;
        const comments = await db.Comment.findAll({
            where: { animeId },
            include: [{
                model: db.User,
                as: 'author',
                attributes: ['id', 'nome', 'avatar'] // Apenas os dados públicos do autor
            }],
            order: [['createdAt', 'DESC']] // Os mais recentes primeiro
        });
        res.status(200).json(comments);
    } catch (error) {
        console.error("Erro ao buscar comentários:", error);
        res.status(500).json({ success: false, error: 'Erro interno ao buscar comentários.' });
    }
};

// --- LÓGICA PARA POSTAR UM NOVO COMENTÁRIO ---
exports.postComment = async (req, res) => {
    try {
        const { animeId, text } = req.body;
        const userId = req.user.id;

        if (!text || text.trim().length < 3) {
            return res.status(400).json({ success: false, error: 'O comentário deve ter no mínimo 3 caracteres.' });
        }

        const newComment = await db.Comment.create({
            animeId,
            userId,
            text
        });

        // Retorna o comentário recém-criado com os dados do autor para renderização imediata
        const commentWithAuthor = await db.Comment.findByPk(newComment.id, {
            include: [{
                model: db.User,
                as: 'author',
                attributes: ['id', 'nome', 'avatar']
            }]
        });

        res.status(201).json(commentWithAuthor);
    } catch (error) {
        console.error("Erro ao postar comentário:", error);
        res.status(500).json({ success: false, error: 'Erro interno ao salvar o comentário.' });
    }
};

// --- LÓGICA PARA SALVAR UMA NOVA CLASSIFICAÇÃO ---
exports.postRating = async (req, res) => {
    try {
        const { animeId, rating } = req.body;
        const userId = req.user.id;

        if (!animeId || !rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, error: 'Dados de classificação inválidos.' });
        }

        // Procura por uma avaliação existente. Se não encontrar, cria uma nova.
        const [ratingRecord, created] = await db.Rating.findOrCreate({
            where: { userId, animeId },
            defaults: { rating }
        });

        // Se a avaliação já existia, apenas atualiza a nota.
        if (!created) {
            ratingRecord.rating = rating;
            await ratingRecord.save();
        }

        // TODO: Recalcular a média de classificação do anime e salvar no modelo Anime.
        // Exemplo:
        // const allRatings = await db.Rating.findAll({ where: { animeId } });
        // const averageRating = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;
        // await db.Anime.update({ classificacao: averageRating.toFixed(1) }, { where: { id: animeId } });

        res.status(200).json({ success: true, message: 'Avaliação registrada com sucesso.' });
    } catch (error) {
        console.error("Erro ao registrar avaliação:", error);
        res.status(500).json({ success: false, error: 'Erro interno ao registrar a avaliação.' });
    }
};