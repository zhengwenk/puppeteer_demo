const fs = require('fs');
const path = require('path');
const {db} = require('../db/index.cjs'); // { query, pool }

/**
 * @typedef {Object} ModelTypes
 * @property {import('./TaskExecutePlanModel.cjs')} TaskExecutePlanModel
 * @property {import('./AiAccountModel.cjs')} AiAccountModel
 */

/** @type {ModelTypes} */
const models = {};

function extractClass(exportsObj) {
    // 1. 直接导出 class
    if (typeof exportsObj === 'function') {
        return exportsObj;
    }

    // 2. default 导出
    if (exportsObj && typeof exportsObj.default === 'function') {
        return exportsObj.default;
    }

    // 3. 在对象里面找 class
    if (exportsObj && typeof exportsObj === 'object') {
        for (const key of Object.keys(exportsObj)) {
            if (typeof exportsObj[key] === 'function') {
                return exportsObj[key];
            }
        }
    }

    return null;
}

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
        const ModelClass = extractClass(exportsObj);

        if (!ModelClass) {
            console.warn(`Skipping ${file}, no class detected`);
            return;
        }

        const modelName = path.basename(file, path.extname(file));
        models[modelName] = new ModelClass(db);
    }
});

module.exports = models;