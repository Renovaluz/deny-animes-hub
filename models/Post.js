'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Post extends Model {
    static associate(models) {
      Post.belongsTo(models.User, { foreignKey: 'autorId', as: 'autor' });
    }
  }
  Post.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    titulo: { type: DataTypes.STRING, allowNull: false },
    conteudo: { type: DataTypes.TEXT('long'), allowNull: false },
    imagemDestaque: DataTypes.STRING,
    autorNome: DataTypes.STRING,
    tags: {
      type: DataTypes.TEXT,
      get() { const v = this.getDataValue('tags'); return v ? JSON.parse(v) : []; },
      set(v) { const t = Array.isArray(v) ? v : (v ? v.split(',').map(t => t.trim()) : []); this.setDataValue('tags', JSON.stringify(t)); }
    },
    categoria: { type: DataTypes.STRING, defaultValue: "Notícia" },
    emDestaque: { type: DataTypes.BOOLEAN, defaultValue: false },
    views: { type: DataTypes.INTEGER, defaultValue: 0 }
  }, {
    sequelize,
    modelName: 'Post',
    tableName: 'posts',
    timestamps: true
  });
  return Post;
};