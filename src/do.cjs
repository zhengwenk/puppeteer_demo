const handlers = require('./scrape/index.cjs');
const {createBrowser, createPage, headlessStatus} = require("./browser.cjs");
const {asyncForEach} = require("./util/array.cjs");
const {randomInt} = require("./util/math.cjs")
//const {removeDirSync} = require("./util/file.cjs");
const ScrapeService = require("./service/ScrapeService.cjs");
const {lockProcess} = require("./util/lock.cjs");
const fs = require('fs');
const {waitSafe, waitForGotoSafe} = require("./util/wait.cjs");
const TIMEOUT = require('./util/timeout.cjs');

const execOnceLimit = 200;
const aiAccountId = Number(process.env.AI_ACCOUNT_ID) || 0;
const lockFileDir = process.env.PUPPETEER_LOCK_FILE_DIR || '';

if (aiAccountId <= 0) {
    console.error(`请设置正确的AI_ACCOUNT_ID环境变量`);
    process.exit(1);
}

// 目录不存在
if (!fs.existsSync(lockFileDir)) {
    console.error(`PUPPETEER_LOCK_FILE_DIR`);
    process.exit(1);
}

// 检查进程是否已经在运行
const lockFilePath = `${lockFileDir}/do_${aiAccountId}.lock`;
const isLocked = lockProcess(lockFilePath, process.pid);
if (!isLocked) {
    console.log(`该任务已有一个实例在运行，退出当前进程。`);
    process.exit(1);
}

(async () => {
    const scrapeService = new ScrapeService();
    let browser;
    try {
        // 获取环境变量确定是那个账号id

        const aiAccount = await scrapeService.getAiBotById(aiAccountId);
        if (!aiAccount) {
            console.error(`未找到对应的AI账号，ID: ${aiAccountId}`);
            return false;
        }

        console.log(aiAccount);

        const handler = handlers[aiAccount.channel] || null;

        if (!handler) {
            console.error(`未找到对应的action，channel: ${aiAccount.channel}`);
            return false;
        }

        // 获取任务执行计划
        const list = await scrapeService.getTaskPlanList(aiAccount.id, execOnceLimit);

        if (list.length === 0) {
            console.log(`未查找到需要处理的数据，channel: ${aiAccount.channel}`);
            return false;
        }

        const userDataDir = process.env.PUPPETEER_CHROME_USER_DATA_DIR + `/${aiAccount.user_name}`;

        browser = await createBrowser({
            //headless: "new",
            headless: headlessStatus(),
            userDataDir: userDataDir,
            // args: [
            //     '--proxy-server=http://110.185.105.144:50004'
            // ]
            // @todo
            executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        });

        const page = await createPage(browser);
        // 监听 浏览器的console
        //page.on('console', msg => console.log('PAGE LOG:', msg.text()));

        // await page.goto("chrome://version");
        // console.log(await page.content());
        // return

        // 失败重试id列表
        //const failTaskIds = [];

        await asyncForEach(list, async (item, index) => {
            // 开始任务
            console.log(`开始处理任务, 任务ID: ${item.id}`);

            try {
                const resultId = await scrapeService.startTaskPlan(item)

                if (resultId <= 0) {
                    console.log(`任务开始失败，任务ID: ${item.id}`);
                    return
                }

                console.log(`任务开启成功`);

                const questionInfo = await scrapeService.getTaskPlanQuestionById(item.question_id);

                if (!questionInfo) {
                    // 任务问题不存在，标记为失败
                    console.log(`任务失败1`);
                    await scrapeService.failTaskPlan(item, resultId, "任务不存在");
                    return;
                }

                if (questionInfo && questionInfo.is_deleted === ScrapeService.question_status_deleted) {
                    // 任务问题已删除，标记为失败
                    console.log(`任务失败2`);
                    await scrapeService.failTaskPlan(item, resultId, "问题已删除");
                    return;
                }

                //removeDirSync(userDataDir);
                // 打开目标页面
                console.log(aiAccount.url);
                //await page.goto(aiAccount.url, {waitUntil: 'networkidle2', timeout: TIMEOUT.T10S});
                const gotoResult = await waitForGotoSafe(
                    page, aiAccount.url, {
                        waitSelector: handler.getTextSelector(),
                    }
                );

                if (!gotoResult.ok) {
                    console.log(`${gotoResult.tag} 失败`, gotoResult.error.message)
                    // 重试一次
                    const gotoResult = await waitForGotoSafe(
                        page, aiAccount.url, {
                            waitSelector: handler.getTextSelector(),
                        }
                    );

                    if (!gotoResult.ok) {
                        console.log(`${gotoResult.tag} 失败`, gotoResult.error.message)
                        await scrapeService.failTaskPlan(item, resultId, `打开页面失败: ${gotoResult.error.message}`);
                    }
                }

                let success, msg, result;
                ({success, msg, result} = await handler.action(page, questionInfo))
                if (success) {
                    await scrapeService.completeTaskPlan(item, resultId, msg, result);
                } else {
                    // 等待一会儿重试一次
                    await waitSafe(page, randomInt(60000, 120000));
                    await page.goto(aiAccount.url, {waitUntil: 'networkidle2', timeout: 10000});

                    ({success, msg, result} = await handler.action(page, questionInfo))

                    if (success) {
                        await scrapeService.completeTaskPlan(item, resultId, msg, result);
                    } else {
                        await scrapeService.failTaskPlan(item, resultId, msg, result);
                    }
                }

                //await browser.close();

                console.log(`任务成功, 等待下次任务......`);

                // 增加请求的间隔
                await new Promise(r => setTimeout(r, randomInt(30000, 60000)));
            } catch (err) {
                console.error("\n--- 程序发生致命错误 ---");
                console.error("错误详情:", err.message);
                console.error("--------------------------\n");
                if (err.stack) {
                    console.error("堆栈跟踪:", err.stack);
                } else {
                    // 如果 error 对象没有 stack 属性 (例如它只是一个简单的字符串拒绝)，
                    // 也可以直接输出完整的 error 对象
                    console.error("完整错误对象:", err);
                }
            }
        });
    } catch (error) {
        // 捕获所有 Promise 拒绝和同步错误
        console.error("\n--- 程序发生致命错误 ---");
        console.error("错误详情:", error.message);
        console.error("--------------------------\n");
        if (error.stack) {
            console.error("堆栈跟踪:", error.stack);
        } else {
            // 如果 error 对象没有 stack 属性 (例如它只是一个简单的字符串拒绝)，
            // 也可以直接输出完整的 error 对象
            console.error("完整错误对象:", error);
        }
    } finally {
        await scrapeService.destroyDB()

        if (browser) {
            await browser.close();
            console.log("浏览器已关闭。");
        }

        process.exit(0);
    }
})();