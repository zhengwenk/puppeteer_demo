const handlers = require('./scrape/index.cjs');
const {createBrowser, createPage} = require("./browser.cjs");
const {asyncForEach} = require("./util/array.cjs");
const {randomInt} = require("./util/math.cjs")
const {removeDirSync} = require("./util/file.cjs");
const ScrapeService = require("./service/ScrapeService.cjs");

const execOnceLimit = 100;

(async () => {
    const scrapeService = new ScrapeService();
    let browser;
    try {
        // 获取环境变量确定是那个账号id
        const inputAccountId = Number(process.env.AI_ACCOUNT_ID);
        const aiAccount = await scrapeService.getAiBotById(inputAccountId);
        if (!aiAccount) {
            console.error(`未找到对应的AI账号，ID: ${process.env.AI_ACCOUNT_ID}`);
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
            headless: false,
            userDataDir: userDataDir,
            // args: [
            //     '--proxy-server=http://110.185.105.144:50004'
            // ]
        });

        const page = await createPage(browser);

        const testUrl = "https://bot.sannysoft.com"

        await page.goto(testUrl, {waitUntil: 'domcontentloaded', timeout: 10000});


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