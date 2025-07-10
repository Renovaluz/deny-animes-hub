// ====================================================================================
//
//              DenyAnimeHub - Modelo de Dados: Anime (Versão Final e Completa)
//
// Versão:        4.0
// Descrição:     Versão definitiva do modelo Anime. Inclui todos os campos
//                necessários pela aplicação (trailerUrl, idioma, estudio), além
//                da lógica de slug, validações robustas e associações corretas.
//                Este modelo agora está 100% alinhado com os controllers e rotas.
//
// ====================================================================================

'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Anime extends Model {
    static associate(models) {
      Anime.hasMany(models.Episodio, {
        foreignKey: { name: 'animeId', allowNull: false },
        as: 'episodios',
        onDelete: 'CASCADE'
      });
    }
  }

  Anime.init({
    // --- Campos Principais ---
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    slug: { type: DataTypes.STRING, allowNull: false, unique: true },
    titulo: { type: DataTypes.STRING, allowNull: false, unique: true },
    sinopse: { type: DataTypes.TEXT('long'), allowNull: false },
    anoLancamento: { type: DataTypes.INTEGER, allowNull: false },
    generos: {
      type: DataTypes.TEXT,
      allowNull: false,
      get() { const v = this.getDataValue('generos'); return v ? JSON.parse(v) : []; },
      set(v) { const t = Array.isArray(v) ? v : (v ? v.split(',').map(s => s.trim()) : []); this.setDataValue('generos', JSON.stringify(t)); }
    },
    imagemCapa: { type: DataTypes.STRING, allowNull: false },

    // --- CAMPOS ADICIONAIS QUE ESTAVAM FALTANDO ---
    trailerUrl: {
      type: DataTypes.STRING,
      allowNull: true, // Pode não ter trailer
      validate: {
        isUrl: { msg: 'A URL do trailer deve ser um link válido.' }
      }
    },
    idioma: {
      type: DataTypes.STRING,
      allowNull: true // Pode ser opcional
    },
    estudio: {
      type: DataTypes.STRING,
      allowNull: true // Pode ser opcional
    },
    
    // --- Metadados ---
    classificacao: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: { min: 0, max: 10 }
    },
    views: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Anime',
    tableName: 'animes',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['slug'] },
      { fields: ['titulo'] }
    ]
  });

  return Anime;
};