'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Historico extends Model {
    static associate(models) {
      Historico.belongsTo(models.User, { foreignKey: 'usuarioId', as: 'usuario' });
      Historico.belongsTo(models.Anime, { foreignKey: 'animeId', as: 'anime' });
    }
  }
  Historico.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    ultimoEpisodioAssistido: {
      type: DataTypes.JSON, // Armazena o objeto { numero, titulo } como JSON
      allowNull: false
    }
    // As chaves estrangeiras `usuarioId` e `animeId` serão adicionadas pelas associações
  }, {
    sequelize,
    modelName: 'Historico',
    tableName: 'historicos',
    timestamps: true,
    // Índice para garantir que um usuário tenha apenas uma entrada por anime
    indexes: [
      {
        unique: true,
        fields: ['usuarioId', 'animeId']
      }
    ]
  });
  return Historico;
};