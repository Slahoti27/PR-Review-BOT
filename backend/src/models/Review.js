const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Review = sequelize.define('Review', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false, references: { model: User, key: 'id' } },
  prUrl: { type: DataTypes.TEXT, allowNull: false },
  repoOwner: { type: DataTypes.STRING, allowNull: false },
  repoName: { type: DataTypes.STRING, allowNull: false },
  prNumber: { type: DataTypes.INTEGER, allowNull: false },
  prTitle: { type: DataTypes.TEXT },
  status: { type: DataTypes.ENUM('pending', 'completed', 'failed'), defaultValue: 'pending' },
  failureReason: { type: DataTypes.TEXT },
  // Stores full Claude response as JSON array of issues
  reviewData: { type: DataTypes.JSONB },
  // Summary counts
  criticalCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  majorCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  minorCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  // Whether it was posted back to GitHub
  postedToGithub: { type: DataTypes.BOOLEAN, defaultValue: false },
  githubCommentId: { type: DataTypes.STRING },
  // Public share token
  shareToken: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, unique: true },
});

User.hasMany(Review, { foreignKey: 'userId' });
Review.belongsTo(User, { foreignKey: 'userId' });

module.exports = Review;
