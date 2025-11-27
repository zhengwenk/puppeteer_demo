const BaseModel = require('./BaseModel.cjs');

class AiAccountModel extends BaseModel {
    static tableName = "ai_ask_detail"
}

module.exports = AiAccountModel;