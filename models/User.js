'use strict';
const { Model } = require('sequelize');
const bcrypt = require('bcryptjs');
const crypto = require('crypto'); // Importa o módulo crypto do Node.js

// A estrutura do módulo exporta uma função que recebe 'sequelize' e 'DataTypes'
module.exports = (sequelize, DataTypes) => {
  // A definição da classe permanece aqui dentro
  class User extends Model {
    static associate(models) {
      User.hasMany(models.Post, { foreignKey: 'autorId', as: 'posts' });
      User.hasMany(models.Historico, { foreignKey: 'userId', as: 'historicos' });
      User.hasMany(models.Comment, { foreignKey: 'userId', as: 'comments' });
      User.hasMany(models.Rating, { foreignKey: 'userId', as: 'ratings' });
    }

    // O método para gerar o token de reset
    getResetPasswordToken() {
        const resetToken = crypto.randomBytes(20).toString('hex');
        this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutos
        return resetToken;
    }
  }

  // A chamada User.init agora está dentro da função exportada, onde 'sequelize' existe
  User.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nome: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
    senha: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM('user', 'admin'), defaultValue: 'user' },
    avatar: { type: DataTypes.STRING, defaultValue: '/images/default-avatar.png' },
    bio: { type: DataTypes.TEXT, defaultValue: 'Entusiasta de animes e membro do DenyAnimeHub!' },
    capaPerfil: { type: DataTypes.STRING, defaultValue: '/images/default-cover.png' },
    resetPasswordToken: DataTypes.STRING,
    resetPasswordExpire: DataTypes.DATE
  }, {
    sequelize, // A instância do Sequelize é passada aqui
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    defaultScope: { attributes: { exclude: ['senha'] } },
    scopes: { comSenha: { attributes: { include: ['senha'] } } },
    hooks: {
      beforeCreate: async (user) => {
        if (user.senha) {
          const salt = await bcrypt.genSalt(10);
          user.senha = await bcrypt.hash(user.senha, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('senha')) {
          const salt = await bcrypt.genSalt(10);
          user.senha = await bcrypt.hash(user.senha, salt);
        }
      }
    }
  });

  // O método de protótipo é adicionado aqui
  User.prototype.compararSenha = async function (senhaInserida) {
    return await bcrypt.compare(senhaInserida, this.senha);
  };

  // Em models/user.js (exemplo de como ficaria)
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    // ... outros campos como nome, email, senha ...
    receberNotificacoes: {
      type: DataTypes.BOOLEAN,
      defaultValue: true // Começa como 'true' para novos usuários, ou 'false' se preferir
    }
  });
  return User;
};

  // Retorna a classe User
  return User;
};