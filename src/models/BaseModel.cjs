class BaseModel {
    static tableName

    constructor(db) {
        this.db = db;
    }

    get tableName() {
        if (!this.constructor.tableName) throw new Error('tableName not defined in subclass');
        return this.constructor.tableName;
    }

    get hasTimestamps() {
        return true
    }

    get hasSoftDelete() {
        return true
    }

    query(trx = null) {
        return trx ? trx(this.constructor.tableName) : this.db.table(this.constructor.tableName);
    }

    async create(data, trx = null) {

        if (this.hasTimestamps) {
            const nowTs = Date.now();
            data.create_ts = nowTs;
            data.update_ts = nowTs;
        }

        const [id] = await this.query(trx).insert(data);
        return id;
    }

    async update(where, data, trx = null) {

        if (this.hasTimestamps) {
            data.update_ts = Date.now();
        }

        return this.query(trx).where(where).update(data);
    }

    async updateById(id, data, trx = null) {
        return this.update({id}, data, trx);
    }

    async delete(where, trx = null) {
        return this.query(trx).delete(where);
    }

    async deleteById(id, trx = null) {
        return this.delete({id}, trx);
    }

    async deleteSoftById(id, trx = null) {
        let data = {}
        if (this.hasSoftDelete) {
            data.data_status = 0
        }

        return this.updateById(id, data)
    }

    async find(where = {}, columns = ['*'], options = {}, trx = null) {
        let qb = this.query(trx).select(columns);

        // orderBy
        if (options.orderBy) {
            const [column, direction = 'asc'] = options.orderBy;
            qb = qb.orderBy(column, direction);
        }

        // limit / offset
        if (options.limit != null) qb = qb.limit(options.limit);
        if (options.offset != null) qb = qb.offset(options.offset);

        // first
        if (options.first) {
            qb = qb.first();
        }

        return qb;
    }

    async findById(id, columns = ['*'], trx = null) {
        return this.query(trx)
            .select(columns)
            .where({id})
            .first();
    }

    async findOne(where = {}, columns = ['*'], trx = null) {
        return this.query(trx)
            .select(columns)
            .where(where)
            .first();
    }

    async findAll(where = {}, columns = ['*'], trx = null) {
        return this.query(trx)
            .select(columns)
            .where(where)
    }

    async count(where = {}, columns = "*", trx) {
        const c = await this.query(trx).count(`${columns} as total`)

        if (c.length > 0) {
            return c[0].total
        }

        return 0;
    }

    async selectForUpdate(where = {}, trx = null, columns = ['*']) {
        return this.query(trx)
            .select(columns)
            .where(where)
            .forUpdate()
    }

    async transaction(fn) {
        return this.db.transaction(fn);
    }

    async destroy() {
        this.db.destroy()
    }
}

module.exports = BaseModel;