// Arquivo: models/episodio.js

'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Episodio extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Define a associação: Um Episódio PERTENCE A um Anime
      // Isso cria a chave estrangeira 'animeId' nesta tabela.
      Episodio.belongsTo(models.Anime, { 
        foreignKey: 'animeId', 
        as: 'anime' 
      });
    }
  }

  Episodio.init({
    id: { 
      type: DataTypes.INTEGER, 
      autoIncrement: true, 
      primaryKey: true 
    },
    numero: { 
      type: DataTypes.INTEGER, 
      allowNull: false 
    },
    titulo: { 
      type: DataTypes.STRING, 
      allowNull: true // Título é opcional, como no painel admin
    },
    urlVideo: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    tipoVideo: { 
      type: DataTypes.STRING, 
      defaultValue: 'iframe' 
    },
    temporada: { 
      type: DataTypes.INTEGER, 
      allowNull: false, 
      defaultValue: 1 
    },
    // Chave estrangeira que será criada pela associação
    animeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'animes', // Nome da TABELA de animes
        key: 'id'
      },
      onDelete: 'CASCADE', // Se deletar um anime, todos os seus episódios são deletados junto.
      onUpdate: 'CASCADE'
    }
  }, {
    sequelize,
    modelName: 'Episodio',
    tableName: 'episodios', // Nome da tabela no banco de dados
    timestamps: false // Geralmente não precisamos de createdAt/updatedAt para episódios
  });

  return Episodio;
};