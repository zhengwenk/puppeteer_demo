const fs = require('fs');
const path = require('path');

const handlers = {};

const files = fs.readdirSync(__dirname)
    .filter(f => f.endsWith('.js') && f !== 'index.js');

for (const file of files) {
    const handler = require(path.join(__dirname, file));

    if (!handler.channel) {
        console.error(`⚠️ login ${file} 缺少 channel 字段`);
        continue;
    }

    handlers[handler.channel] = handler;
}

module.exports = handlers;