const knex = require('knex');
const config = require('./config.cjs')

const knexClient = knex(config);

// 自动重连（监听 fatal error）
knexClient.on('error', (err) => {
    console.error('[Knex Error]', err);
});

module.exports = {
    knexClient
};