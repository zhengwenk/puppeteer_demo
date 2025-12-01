const handlers = require('./scrape/index.cjs');
const {createBrowser, createPage} = require("./browser.cjs");
const {asyncForEach} = require("./util/array.cjs");
const {randomInt} = require("./util/math.cjs")
const {removeDirSync} = require("./util/file.cjs");
const ScrapeService = require("./service/ScrapeService.cjs");

const execOnceLimit = 100;

(async () => {
    const scrapeService = new ScrapeService();

    try {
        // 获取环境变量确定是那个账号id
        const inputAccountId = Number(process.env.Ai_ACCOUNT_ID);
        const aiAccount = await scrapeService.getAiBotById(inputAccountId);
        if (!aiAccount) {
            console.error(`未找到对应的AI账号，ID: ${process.env.Ai_ACCOUNT_ID}`);
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

        await asyncForEach(list, async (item, index) => {
            // 开始任务
            console.log(`开始处理任务, 任务ID: ${item.id}`);
            let browser;
            try {
                const resultId = await scrapeService.startTaskPlan(item)

                if (resultId <= 0) {
                    console.log(`任务开始失败，任务ID: ${item.id}`);
                    return
                }

                console.log(`任务开启成功`);

                const questionInfo = await scrapeService.getTaskPlanQuestionById(item.question_id);

                if (!questionInfo) {
                    // 任务问题不存，标记为失败
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

                const userDataDir = process.env.PUPPETEER_CHROME_USER_DATA_DIR + `/${aiAccount.user_name}`;

                //removeDirSync(userDataDir);

                browser = await createBrowser({
                    headless: "new",
                    userDataDir: userDataDir,
                    args: [
                        '--proxy-server=http://110.185.105.144:50004'
                    ]
                });

                const page = await createPage(browser);
                // 监听 浏览器的console
                //page.on('console', msg => console.log('PAGE LOG:', msg.text()));

                // 打开目标页面
                console.log(aiAccount.url);

                await page.goto(aiAccount.url, {waitUntil: 'domcontentloaded', timeout: 10000});
                const {success, msg, result} = await handler.action(page, questionInfo);

                console.log(success, msg, result);

                if (success) {
                    await scrapeService.completeTaskPlan(item, resultId, msg, result);
                }

                //await browser.close();

                console.log(`任务成功, 等待下次任务......`);

                // 增加请求的间隔
                await new Promise(r => setTimeout(r, randomInt(3000, 10000)));
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
            } finally {
                if (browser) {
                    await browser.close();
                    console.log("浏览器已关闭。");
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
    }
})();