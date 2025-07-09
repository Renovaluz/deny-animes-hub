// ====================================================================================
//
//              DenyAnimeHub - Controller: Animes
//
// Versão:        2.0 (Titan)
// Descrição:     Este controller gerencia toda a lógica de negócios (CRUD) para os animes.
//                Ele interage com os modelos 'Anime' e 'Episodio' do Sequelize para
//                realizar operações no banco de dados. As funções aqui são projetadas
//                para serem robustas, com tratamento de erros detalhado e uso de transações
//                para garantir a consistência dos dados.
//
// ====================================================================================

'use strict';
const { Anime, Episodio, sequelize } = require('../models');

/**
 * Cria um novo anime no banco de dados.
 * Utiliza uma transação para garantir que a operação seja atômica.
 * @route POST /api/animes
 */
exports.createAnime = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { titulo, sinopse, anoLancamento, generos, classificacao, imagemCapa } = req.body;

        // Validação de entrada rigorosa
        if (!titulo || !sinopse || !anoLancamento || !generos || !imagemCapa) {
             await transaction.rollback();
             return res.status(400).json({ success: false, error: 'Todos os campos, incluindo a URL da capa, são obrigatórios.' });
        }
        if (titulo.length < 3) {
            await transaction.rollback();
            return res.status(400).json({ success: false, error: 'O título deve ter pelo menos 3 caracteres.' });
        }

        const novoAnime = await Anime.create({
            titulo,
            sinopse,
            anoLancamento,
            generos, // O modelo já lida com a conversão de string para array
            classificacao: classificacao || null, // Permite valor nulo
            imagemCapa
        }, { transaction });
        
        // Se tudo deu certo, confirma a transação
        await transaction.commit();
        
        console.log(`[Anime Controller] Anime criado com sucesso: ID ${novoAnime.id} - ${novoAnime.titulo}`);
        res.status(201).json({ success: true, data: novoAnime });

    } catch (error) {
        // Se qualquer parte falhar, reverte todas as mudanças no banco de dados
        await transaction.rollback();
        console.error("[Anime Controller] Erro ao criar anime:", error);

        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ success: false, error: 'Conflito: Um anime com este título já existe no banco de dados.' });
        }
        res.status(500).json({ success: false, error: 'Ocorreu um erro inesperado no servidor ao tentar criar o anime.' });
    }
};

/**
 * Busca todos os animes. Para o painel de admin, inclui uma contagem de episódios
 * para otimizar a performance, evitando carregar todos os dados de todos os episódios.
 * @route GET /api/animes
 */
exports.getAllAnimes = async (req, res) => {
    try {
        const animes = await Anime.findAll({
            include: [{
                model: Episodio,
                as: 'episodios',
                attributes: ['id'] // Apenas o ID para a contagem (Sequelize faz `COUNT(episodios.id)`)
            }],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json({ success: true, data: animes });
    } catch (error) {
        console.error("[Anime Controller] Erro ao buscar todos os animes:", error);
        res.status(500).json({ success: false, error: 'Ocorreu um erro no servidor ao listar os animes.' });
    }
};

/**
 * Busca um anime específico por seu ID.
 * Inclui todos os dados de todos os episódios associados, ordenados.
 * @route GET /api/animes/:id
 */
exports.getAnimeById = async (req, res) => {
    try {
        const { id } = req.params;
        const anime = await Anime.findByPk(id, {
            include: [{
                model: Episodio,
                as: 'episodios',
                order: [['temporada', 'ASC'], ['numero', 'ASC']]
            }]
        });

        if (!anime) {
            return res.status(404).json({ success: false, error: 'Anime não encontrado.' });
        }
        res.status(200).json({ success: true, data: anime });
    } catch (error) {
        console.error(`[Anime Controller] Erro ao buscar anime por ID (${req.params.id}):`, error);
        res.status(500).json({ success: false, error: 'Ocorreu um erro no servidor ao buscar os detalhes do anime.' });
    }
};

/**
 * Atualiza os dados de um anime existente.
 * @route PUT /api/animes/:id
 */
exports.updateAnime = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const [updatedRows] = await Anime.update(req.body, { 
            where: { id: id },
            transaction 
        });

        if (updatedRows > 0) {
            const updatedAnime = await Anime.findByPk(id, { transaction });
            await transaction.commit();
            return res.status(200).json({ success: true, data: updatedAnime });
        }
        
        await transaction.rollback();
        return res.status(404).json({ success: false, error: 'Anime não encontrado para atualização.' });

    } catch (error) {
        await transaction.rollback();
        console.error(`[Anime Controller] Erro ao atualizar anime ID (${req.params.id}):`, error);
        res.status(500).json({ success: false, error: 'Não foi possível atualizar o anime.' });
    }
};

/**
 * Deleta um anime do banco de dados.
 * Graças à configuração 'onDelete: CASCADE' no modelo, todos os episódios
 * associados a este anime serão deletados automaticamente pelo banco de dados.
 * @route DELETE /api/animes/:id
 */
exports.deleteAnime = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedRows = await Anime.destroy({ where: { id: id } });

        if (deletedRows === 0) {
            return res.status(404).json({ success: false, error: 'Anime não encontrado.' });
        }
        
        console.log(`[Anime Controller] Anime deletado com sucesso: ID ${id}`);
        res.status(200).json({ success: true, message: 'Anime e todos os seus episódios foram deletados com sucesso.' });
    } catch (error) {
        console.error(`[Anime Controller] Erro ao deletar anime ID (${req.params.id}):`, error);
        res.status(500).json({ success: false, error: 'Ocorreu um erro no servidor ao deletar o anime.' });
    }
};