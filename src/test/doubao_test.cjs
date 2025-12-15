const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const {executablePath} = require('puppeteer');
const {waitSafe, waitForSelectorSafe, waitForGotoSafe, waitForStableContent} = require("../util/wait.cjs");
const TimeOut = require("../util/timeout.cjs");
const Timeout = require("../util/timeout.cjs");
const {getQuestionText} = require("./util_argv.cjs");

puppeteer.use(StealthPlugin());

async function getAnswerText(page) {
    return await page.evaluate(() => {

        const containers = [...document.querySelectorAll('.container-PvPoAn')];
        if (!containers.length) return '';

        const last = containers[containers.length - 1];
        if (!last) return '';


        const parts = [...last.querySelectorAll('div[data-testid="message_text_content"]')];
        if (!parts.length) return '';

        //console.log(parts);

        return parts.map(el => el.innerText.trim()).join("\n");
    });
}

(async function () {
    // 启动一个浏览器
    const browser = await puppeteer.launch({
        //headless: "new",
        headless: false,
        devtools: false,
        //defaultViewport: null,
        //defaultViewport: {width: 1440, height: 900},
        args: [
            '--start-maximized',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            // 常用以减少 headless 标志的线索（并非万无一失）
            '--disable-blink-features=AutomationControlled',
            //'--proxy-server=http://114.80.161.93:62000'
        ],
        executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        userDataDir: process.env.PUPPETEER_CHROME_USER_DATA_DIR + "/akai",
    });

    // 打开新的页面
    const page = await browser.newPage();

    //page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    const targetUrl = "https://www.doubao.com/chat/";
    //await page.goto(targetUrl, {waitUntil: 'domcontentloaded', timeout: 20000});

    // 等待文本输入框元素出现（最多等 10秒）
    const textSelector = 'textarea[data-testid="chat_input_input"]';
    //const textEl = await page.waitForSelector(textSelector, {visible: true, timeout: 10000});

    const gotoResult = await waitForGotoSafe(
        page,
        targetUrl,
        {
            waitSelector: textSelector,
        }
    );

    if (!gotoResult.ok) {
        console.log(`导航到目标页面失败:${gotoResult.tag}|${gotoResult.error.message}`);
        return;
    }

    // 可选：聚焦并清空（如果已有默认内容）
    await page.focus(textSelector);
    await page.type(textSelector, getQuestionText(), {delay: 50}); // delay 毫秒，可设为 0
    await waitSafe(page, TimeOut.T3S);

    //await page.screenshot({path: process.env.PUPPETEER_USER_QRCODE_IMG_DIR + '/screenshot1.png'});

    // 鼠标移动模拟
    await page.mouse.move(200, 300);

    // 滚动页面
    await page.evaluate(() => window.scrollBy(0, 400));

    // 再点击发送按钮
    await page.click('#flow-end-msg-send');
    // await page.screenshot({path: process.env.PUPPETEER_USER_QRCODE_IMG_DIR + '/screenshot2.png'});

    //await waitSafe(page, 20000);

    await waitForStableContent(page, getAnswerText, Timeout.T30S, Timeout.T120S);
    //await page.screenshot({path: process.env.PUPPETEER_USER_QRCODE_IMG_DIR + '/screenshot3.png'});

    //return;
    console.log('回答结束,开始获取内容');

    // 获取所有回答文本（最新那条）
    const answer = await getAnswerText();

    console.log("AI 回复：", answer);

    const searchSelector = 'div[data-testid="search-reference-ui"]';

    const searchEl = await waitForSelectorSafe(page, searchSelector, {visible: true, timeout: 5000});

    if (!searchEl) {
        console.log("未找到搜索结果");

    } else {
        await searchEl.click();

        await waitSafe(page, 3000);

        const results = await page.evaluate(() => {
            // 获取所有 data-testid="search-text-item" 的元素
            const items = [...document.querySelectorAll('[data-testid="search-text-item"]')];

            return items.map(item => {
                // 搜索子元素 class 以 "search-item-title-" 开头
                const titleEl = item.querySelector('[class*="search-item-title-"]');
                const summaryEl = item.querySelector('[class*="search-item-summary-"]');
                // 搜索子元素 class 以 "footer-title-" 开头
                const sourceEl = item.querySelector('[class*="footer-title-"]');

                const linkEl = item.querySelector('a');

                return {
                    title: titleEl ? titleEl.innerText.trim() : "",
                    snippet: summaryEl ? summaryEl.innerText.trim() : "",
                    source: sourceEl ? sourceEl.innerText.trim() : "",
                    link: linkEl ? linkEl.href.trim() : ""
                };
            });
        });

        console.log(results);
    }

    //await browser.close();

})();