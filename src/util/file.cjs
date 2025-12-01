const fs = require('fs');
const fsp = require('fs/promises')

async function removeDir(path) {
    if (!fs.existsSync(path)) {
        console.log(`目录不存在：${path}`);
        return;
    }

    await fsp.rm(path, {
        recursive: true,
        force: true,
    });

    console.log(`已删除目录：${path}`);
}

function removeDirSync(path) {
    if (!fs.existsSync(path)) return;

    fs.rmSync(path, {recursive: true, force: true});
}

module.exports = {
    removeDir,
    removeDirSync
}