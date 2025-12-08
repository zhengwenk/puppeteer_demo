const {lockProcess} = require("../util/lock.cjs");
const fs = require("fs");

const aiAccountId = Number(process.env.AI_ACCOUNT_ID) || 0;
const lockFileDir = process.env.PUPPETEER_LOCK_FILE_DIR || '';

if (aiAccountId <= 0) {
    console.error(`请设置正确的AI_ACCOUNT_ID环境变量`);
    process.exit(1);
}

// 目录不存在
if (!fs.existsSync(lockFileDir)) {
    console.error(`PUPPETEER_LOCK_FILE_DIR 目录不存在`);
    process.exit(1);
}
const lockFile = `${lockFileDir}/do_${aiAccountId}.lock`;
const ok = lockProcess(lockFile, process.pid);
if (!ok) {
    console.error('已有进程在运行，退出。');
    process.exit(1);
}
console.log('进程锁定成功，继续执行。');
console.log(`Process ID: ${process.pid}`);

// 模拟进程执行
setInterval(() => {
    console.log("doing.......")
}, 3000);