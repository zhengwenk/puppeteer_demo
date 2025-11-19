const fs = require('fs');
const path = require('path');

const actions = {};

const files = fs.readdirSync(__dirname)
    .filter(f => f.endsWith('.js') && f !== 'index.js');

for (const file of files) {
    const action = require(path.join(__dirname, file));

    if (!action.channel) {
        console.error(`⚠️ scrape ${file} 缺少 channel 字段`);
        continue;
    }

    actions[action.channel] = action;
}

module.exports = actions;