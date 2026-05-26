const { Sequelize } = require('sequelize');

const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false'
  ? false
  : process.env.NODE_ENV === 'production';

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized },
  },
  logging: false,
});

module.exports = sequelize;
