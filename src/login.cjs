const loginHandlers = require('./login_handlers/index.cjs');
const {createBrowser} = require("./browser.cjs");

(async () => {
    // 确保整个主逻辑都被 try...catch 包裹，以捕获所有可能发生的错误
    let browser;
    try {
        // 获取环境变量确定是那个机器人
        const username = "zhengwenkai"; // 临时写死，后续可改为动态获取
        const channel = "doubao"; // 临时写死，后续可改为动态获取

        const loginHandler = loginHandlers[channel] || null;

        if (!loginHandler) {
            throw new Error(`未找到对应的登录处理器，channel: ${channel}`);
        }

        browser = await createBrowser({
            headless: "new",
            userDataDir: process.env.PUPPETEER_CHROME_USER_DATA_DIR + `/${username}`,
        });

        const page = await browser.newPage();
        // 监听 浏览器的console
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));

        // 打开目标页面 可以改成动态
        const targetUrl = "https://www.doubao.com/chat/";
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

        const logined = await loginHandler.doLogin(page)

        if (!logined) {
            throw new Error(`登录失败，channel: ${channel}`);
        }

        console.log("登录成功！");
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
