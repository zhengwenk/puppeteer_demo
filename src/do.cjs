const handlers = require('./scrape/index.cjs');
const {createBrowser} = require("./browser.cjs");
const {asyncForEach} = require("./util/array.cjs");
const {randomInt} = require("./util/math")
const {AiAccountModel, AiAskDetailModel} = require("./models/index.cjs");

(async () => {
    let browser
    try {
        // 获取环境变量确定是那个账号id
        const inputId = Number(process.env.Ai_ACCOUNT_ID);
        const aiAccount = await AiAccountModel.findById(inputId);
        if (!aiAccount || aiAccount.id !== inputId) {
            console.error(`未找到对应的AI账号，ID: ${process.env.Ai_ACCOUNT_ID}`);
            return false;
        }

        const handler = handlers[aiAccount.channel] || null;

        if (!handler) {
            console.error(`未找到对应的action，channel: ${aiAccount.channel}`);
            return false;
        }

        // 获取问题总数
        const list = await AiAskDetailModel.find(
            {ai_id: 1, action_status: 0},
            ['*'],
            {limit: 2}
        );

        if (list.length === 0) {
            console.log(`未查找到需要处理的数据，channel: ${aiAccount.channel}`);
            return false;
        }

        browser = await createBrowser({
            headless: "new",
            userDataDir: process.env.PUPPETEER_CHROME_USER_DATA_DIR + `/${aiAccount.user_name}`,
        });

        const page = await browser.newPage();
        // 监听 浏览器的console
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));

        // 打开目标页面
        await page.goto(aiAccount.url, {waitUntil: 'domcontentloaded', timeout: 10000});

        await asyncForEach(list, async (item, index) => {
            console.log(`开始抓取:${item.id}`)
            await handler.action(page, item);
            // 增加请求的间隔
            await new Promise(r => setTimeout(r, randomInt(3000, 10000)));
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
        // 无论如何，确保浏览器被关闭
        if (browser) {
            await browser.close();
            console.log("浏览器已关闭。");
        }
    }
})();