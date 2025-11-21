const {knexClient} = require('./knex.cjs');

async function transaction(scope) {
    return await knexClient.transaction(async (trx) => {
        return scope(trx)
    });
}

module.exports = {
    transaction
};