const fs = require('fs');
const path = require('path');
const {db} = require('../db/index.cjs'); // { query, pool }
const {extractClass} = require('../util/common.cjs');

/**
 * @typedef {Object} ModelTypes
 * @property {import('./TaskExecutePlanModel.cjs')} TaskExecutePlanModel
 * @property {import('./AiAccountModel.cjs')} AiAccountModel
 * @property {import('./TaskExecutePlanResultModel.cjs')} TaskExecutePlanResultModel
 * @property {import('./TaskExpandQuestionModel.cjs')} TaskExpandQuestionModel
 * @property {import('./TaskWordExecuteResultModel.cjs')} TaskWordExecuteResultModel
 */

/** @type {ModelTypes} */
const models = {};


fs.readdirSync(__dirname).forEach(file => {
    // 跳过自身和 BaseModel
    if (file === 'BaseModel.js' ||
        file === 'BaseModel.cjs' ||
        file === 'index.js' ||
        file === 'index.cjs') {
        return;
    }

    // 允许 js / cjs
    if (file.endsWith('.js') || file.endsWith('.cjs')) {
        const filePath = path.join(__dirname, file);
        const exportsObj = require(filePath);
        const modelClass = extractClass(exportsObj);

        if (!modelClass) {
            console.warn(`Skipping ${file}, no class detected`);
            return;
        }

        const modelName = path.basename(file, path.extname(file));
        models[modelName] = new modelClass(db);
    }
});

module.exports = models;