// Arquivo: models/anime.js

'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Anime extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Um Anime TEM MUITOS (hasMany) Episódios.
      // O 'as: episodios' permite que a gente use 'include: [{ model: Episodio, as: 'episodios' }]'
      Anime.hasMany(models.Episodio, { 
        foreignKey: 'animeId', 
        as: 'episodios' 
      });
      
      // Sua associação existente com Histórico permanece
      Anime.hasMany(models.Historico, { 
        foreignKey: 'animeId', 
        as: 'historicos' 
      });
    }
  }

  Anime.init({
    id: { 
      type: DataTypes.INTEGER, 
      autoIncrement: true, 
      primaryKey: true 
    },
    titulo: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      unique: true 
    },
    sinopse: { 
      type: DataTypes.TEXT('long'), 
      allowNull: false 
    },
    anoLancamento: { 
      type: DataTypes.INTEGER, 
      allowNull: false 
    },
    generos: {
      type: DataTypes.TEXT,
      allowNull: false,
      get() {
        const value = this.getDataValue('generos');
        try {
          // Garante que o valor retornado seja sempre um array
          return value ? JSON.parse(value) : [];
        } catch (e) {
          console.error("Erro ao parsear gêneros:", e);
          return [];
        }
      },
      set(value) {
        // Garante que o valor salvo seja sempre uma string JSON de um array
        const toSave = Array.isArray(value) ? value : (typeof value === 'string' ? value.split(',').map(s => s.trim()) : []);
        this.setDataValue('generos', JSON.stringify(toSave));
      }
    },
    imagemCapa: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    trailerUrl: DataTypes.STRING,
    classificacao: DataTypes.FLOAT,
    idioma: DataTypes.STRING,
    estudio: DataTypes.STRING,
    views: { 
      type: DataTypes.INTEGER, 
      defaultValue: 0 
    }
    // O campo 'episodios' foi removido daqui, pois agora é uma tabela separada.
  }, {
    sequelize,
    modelName: 'Anime',
    tableName: 'animes',
    timestamps: true
  });

  return Anime;
};