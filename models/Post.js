// ARQUIVO: models/Post.js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Post extends Model {}

Post.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  titulo: {
    type: DataTypes.STRING,
    allowNull: false
  },
  conteudo: {
    type: DataTypes.TEXT('long'),
    allowNull: false
  },
  imagemDestaque: {
    type: DataTypes.STRING
  },
  // O autorNome será preenchido automaticamente pelo controller
  autorNome: {
    type: DataTypes.STRING
  },
  tags: {
    type: DataTypes.TEXT, // Armazena como JSON string
    get() {
      const rawValue = this.getDataValue('tags');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      // Garante que o valor seja sempre um array antes de stringificar
      const tagsArray = Array.isArray(value) ? value : (value ? value.split(',').map(tag => tag.trim()) : []);
      this.setDataValue('tags', JSON.stringify(tagsArray));
    }
  },
  categoria: {
    type: DataTypes.STRING,
    defaultValue: "Notícia"
  },
  emDestaque: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
  // A coluna 'autorId' será adicionada pelo relacionamento
}, {
  sequelize,
  modelName: 'Post',
  tableName: 'posts',
  timestamps: true,
});

module.exports = Post;