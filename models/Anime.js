'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Anime extends Model {
    static associate(models) {
      Anime.hasMany(models.Historico, { foreignKey: 'animeId', as: 'historicos' });
    }
  }
  Anime.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    titulo: { type: DataTypes.STRING, allowNull: false, unique: true },
    sinopse: { type: DataTypes.TEXT('long'), allowNull: false },
    anoLancamento: { type: DataTypes.INTEGER, allowNull: false },
    generos: {
      type: DataTypes.TEXT,
      allowNull: false,
      get() { const v = this.getDataValue('generos'); return v ? JSON.parse(v) : []; },
      set(v) { this.setDataValue('generos', JSON.stringify(Array.isArray(v) ? v : [])); }
    },
    imagemCapa: { type: DataTypes.STRING, allowNull: false },
    trailerUrl: DataTypes.STRING,
    classificacao: DataTypes.FLOAT,
    idioma: DataTypes.STRING,
    estudio: DataTypes.STRING,
    episodios: {
      type: DataTypes.TEXT('long'),
      get() { const v = this.getDataValue('episodios'); try { return v ? JSON.parse(v) : []; } catch (e) { return []; } },
      set(v) { this.setDataValue('episodios', JSON.stringify(Array.isArray(v) ? v : [])); }
    },
    views: { type: DataTypes.INTEGER, defaultValue: 0 }
  }, {
    sequelize,
    modelName: 'Anime',
    tableName: 'animes',
    timestamps: true
  });
  return Anime;
};