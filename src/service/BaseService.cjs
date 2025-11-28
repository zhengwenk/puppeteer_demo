class BaseService {

    constructor(db) {
        this.db = db;
    }

    async destroyDB() {
        if (this.db) {
            return await this.db.destroy();
        }
    }
}

module.exports = BaseService;