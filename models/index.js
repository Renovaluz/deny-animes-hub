const sequelize = require('../config/database');
const User = require('./User');
const Post = require('./Post');
const Anime = require('./Anime');

// Definindo os relacionamentos
// Um usuário (autor) pode ter vários posts
User.hasMany(Post, {
    foreignKey: 'autorId', // Nome da coluna que será criada em 'posts'
    as: 'posts'
});

// Um post pertence a um único usuário (autor)
Post.belongsTo(User, {
    foreignKey: 'autorId',
    as: 'autor'
});

// Exporta a instância do sequelize e os models
const db = {
    sequelize,
    Sequelize: require('sequelize'),
    User,
    Post,
    Anime
};

module.exports = db;