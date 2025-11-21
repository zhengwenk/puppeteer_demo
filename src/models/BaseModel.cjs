class BaseModel {
    static tableName

    constructor(db) {
        this.db = db;
    }

    get tableName() {
        if (!this.constructor.tableName) throw new Error('tableName not defined in subclass');
        return this.constructor.tableName;
    }

    query(trx = null) {
        return trx ? trx(this.constructor.tableName) : this.db.table(this.constructor.tableName);
    }

    async create(data, trx = null) {
        const [id] = await this.query(trx).insert(data);
        return id;
    }

    async update(where, data, trx = null) {
        return this.query(trx).where(where).update(data);
    }

    async updateById(id, data, trx = null) {
        return this.query(trx).where({id}).update(data);
    }

    async delete(where, trx = null) {
        return this.query(trx).delete(where);
    }

    async deleteById(id, trx = null) {
        return this.query(trx).delete({id});
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
            .select(where, columns)
            .first();
    }

    async findAll(where = {}, columns = ['*'], trx = null) {
        return this.query(trx)
            .select(where, columns)
            .where(where)
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