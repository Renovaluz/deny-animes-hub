const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

class User extends Model {
    async compararSenha(senhaInserida) {
        return await bcrypt.compare(senhaInserida, this.senha);
    }
}

User.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nome: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
    senha: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM('user', 'admin'), defaultValue: 'user' },
    avatar: { type: DataTypes.STRING, defaultValue: '/images/avatar_padrao.png' },
    bio: { type: DataTypes.TEXT, defaultValue: 'Entusiasta de animes e membro do DenyAnimeHub!' },
    capaPerfil: { type: DataTypes.STRING, defaultValue: '/images/capa_padrao.jpg' }
}, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    defaultScope: {
        attributes: { exclude: ['senha'] }
    },
    scopes: {
        comSenha: {
            attributes: { include: ['senha'] }
        }
    },
    hooks: {
        beforeSave: async (user, options) => {
            if (user.changed('senha')) {
                const salt = await bcrypt.genSalt(10);
                user.senha = await bcrypt.hash(user.senha, salt);
            }
        }
    }
});

module.exports = User;