const fs = require('fs');
const fsExt = require('fs-ext');
const path = require('path');

function lockProcess(lockFilePath, processId) {
    const fd = fs.openSync(lockFilePath, 'w+');
    try {
        fsExt.flockSync(fd, 'exnb'); // 非阻塞独占锁
        fs.writeSync(fd, String(processId));
        // 进程退出时释放锁并删除文件
        process.on('exit', () => {
            try {
                fs.closeSync(fd);
                fs.unlinkSync(lockFilePath);
            } catch (e) {
                console.log(e)
            }
        });
        process.on('SIGINT', () => process.exit(0));
        process.on('SIGTERM', () => process.exit(0));
        return true;
    } catch (err) {
        fs.closeSync(fd);
        return false; // 已有进程持有锁
    }
}

module.exports = {
    lockProcess,
}