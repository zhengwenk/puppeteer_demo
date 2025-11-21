const {knexClient} = require('./knex.cjs');
const {transaction} = require('./transaction.cjs');

class Database {
    constructor(knexClient) {
        this.knex = knexClient;
        this.logStart()
    }

    // --- Builder 查询 ---
    table(name) {
        return this.knex(name);
    }

    // --- RAW SQL ---
    raw(sql, params) {
        return this.knex.raw(sql, params);
    }

    // --- 事务 ---
    async transaction(fn) {
        return await transaction(fn);
    }

    destroy() {
        return this.knex.destroy();
    }

    logStart() {
        const startTimes = new Map();

        knexClient.on('query', query => {
            startTimes.set(query.__knexUid, Date.now());
            console.log(`[SQL-START] ${query.sql}`);
        });

        knexClient.on('query-response', (response, query) => {
            const startTime = startTimes.get(query.__knexUid) || Date.now();
            console.log(`[SQL-END] ${query.sql} -- duration: ${Date.now() - startTime}ms`);
            startTimes.delete(query.__knexUid);
        });

        knexClient.on('query-error', (err, query) => {
            const startTime = startTimes.get(query.__knexUid) || Date.now();
            console.error(`[SQL-ERROR] ${query.sql} -- duration: ${Date.now() - startTime}ms -- error: ${err}`);
            startTimes.delete(query.__knexUid);
        });
    }
}

const db = new Database(knexClient);

module.exports = {
    db,
    Database
};