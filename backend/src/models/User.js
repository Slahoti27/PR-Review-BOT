const { DataTypes } = require('sequelize');
const crypto = require('crypto');
const sequelize = require('../config/database');

const TOKEN_PREFIX = 'enc:v1:';

const getEncryptionKey = () => crypto
  .createHash('sha256')
  .update(process.env.TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET || '')
  .digest();

const encryptToken = (token) => {
  if (!token) return token;
  if (token.startsWith(TOKEN_PREFIX)) return token;
  if (!process.env.TOKEN_ENCRYPTION_KEY && !process.env.JWT_SECRET) {
    throw new Error('TOKEN_ENCRYPTION_KEY or JWT_SECRET is required to encrypt GitHub tokens');
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${TOKEN_PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
};

const decryptToken = (value) => {
  if (!value || !value.startsWith(TOKEN_PREFIX)) return value;
  if (!process.env.TOKEN_ENCRYPTION_KEY && !process.env.JWT_SECRET) {
    throw new Error('TOKEN_ENCRYPTION_KEY or JWT_SECRET is required to decrypt GitHub tokens');
  }

  const [ivText, tagText, encryptedText] = value.slice(TOKEN_PREFIX.length).split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivText, 'base64'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, 'base64')),
    decipher.final(),
  ]).toString('utf8');
};

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  githubId: { type: DataTypes.STRING, unique: true, allowNull: false },
  username: { type: DataTypes.STRING, allowNull: false },
  displayName: { type: DataTypes.STRING },
  avatarUrl: { type: DataTypes.TEXT },
  githubAccessToken: {
    type: DataTypes.TEXT,
    allowNull: false,
    get() {
      return decryptToken(this.getDataValue('githubAccessToken'));
    },
    set(value) {
      this.setDataValue('githubAccessToken', encryptToken(value));
    },
  },
});

module.exports = User;
