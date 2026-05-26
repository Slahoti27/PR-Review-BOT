const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  githubId: { type: DataTypes.STRING, unique: true, allowNull: false },
  username: { type: DataTypes.STRING, allowNull: false },
  displayName: { type: DataTypes.STRING },
  avatarUrl: { type: DataTypes.TEXT },
  githubAccessToken: { type: DataTypes.TEXT, allowNull: false },
});

module.exports = User;
