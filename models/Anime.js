const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Anime extends Model {}

Anime.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    titulo: { type: DataTypes.STRING, allowNull: false, unique: true },
    sinopse: { type: DataTypes.TEXT('long'), allowNull: false },
    anoLancamento: { type: DataTypes.INTEGER, allowNull: false },
    generos: {
        type: DataTypes.TEXT,
        allowNull: false,
        get() {
            const rawValue = this.getDataValue('generos');
            return rawValue ? JSON.parse(rawValue) : [];
        },
        set(value) {
            this.setDataValue('generos', JSON.stringify(value));
        }
    },
    imagemCapa: { type: DataTypes.STRING, allowNull: false },
    trailerUrl: DataTypes.STRING,
    classificacao: DataTypes.FLOAT,
    idioma: DataTypes.STRING,
    estudio: DataTypes.STRING,
    episodios: {
        type: DataTypes.TEXT('long'), // Armazena o array de episódios como uma string JSON
        get() {
            const rawValue = this.getDataValue('episodios');
            // Garante que mesmo um valor inválido não quebre o site
            try {
                return rawValue ? JSON.parse(rawValue) : [];
            } catch (e) {
                return [];
            }
        },
        set(value) {
            this.setDataValue('episodios', JSON.stringify(value));
        }
    },
    views: { type: DataTypes.INTEGER, defaultValue: 0 }
}, {
    sequelize,
    modelName: 'Anime',
    tableName: 'animes',
    timestamps: true
});

module.exports = Anime;