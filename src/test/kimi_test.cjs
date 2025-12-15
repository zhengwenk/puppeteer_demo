const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const {executablePath} = require('puppeteer');
const {waitSafe, waitForSelectorSafe, waitForGotoSafe, waitForStableContent} = require("../util/wait.cjs");
const TimeOut = require("../util/timeout.cjs");
const {getQuestionText} = require("./util_argv.cjs");

puppeteer.use(StealthPlugin());

async function getAnswerText(page) {
    return await page.evaluate(() => {
        console.log("start.....");
        const containers = [...document.querySelectorAll('.markdown-container')];
        if (!containers.length) return '';
        console.log(containers);
        const last = containers[containers.length - 1];
        if (!last) return '';
        console.log(last);

        const parts = [...last.querySelectorAll('div.paragraph')];
        if (!parts.length) return '';

        console.log(parts);

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
        userDataDir: process.env.PUPPETEER_CHROME_USER_DATA_DIR + "/user_3764",
    });

    // 打开新的页面
    const page = await browser.newPage();

    // Accept-Language
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'zh-CN,zh;q=0.9',
    });

    // 修复 navigator.plugins / languages
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'languages', {
            get: () => ['zh-CN', 'zh'],
        });
    });

    //page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    const targetUrl = "https://www.kimi.com";
    const textSelector = 'div.chat-input-editor';

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

    // await page.goto(targetUrl, {waitUntil: 'domcontentloaded', timeout: 20000});
    // const textEl = await page.waitForSelector(textSelector, {visible: true, timeout: 5000});
    //
    // if (!textEl) {
    //     return {success: false, msg: "获取文本框失败"}
    // }

    //const text = '帮我写一篇去韩国旅游的详细攻略，包含景点、美食、住宿和交通，一家四口出行。';
    await page.focus(textSelector);
    //await page.click(textSelector);
    await page.type(textSelector, getQuestionText(), {delay: 50}); // delay 毫秒，可设为 0
    await page.mouse.move(200, 300);
    await page.evaluate(() => window.scrollBy(0, 400));
    await waitSafe(TimeOut.T2S);

    //点击发送按钮
    await page.keyboard.press('Enter');

    await waitForStableContent(page, getAnswerText, TimeOut.T30S, TimeOut.T120S);

    // 等待回答
    //await waitSafe(page, 60000);

    // 获取所有回答文本（最新那条）
    const answerText = await getAnswerText(page)

    console.log("ai:" + answerText);

    // kimi的搜索区域是自动展开的，不需要点击
    const searchEl = await waitForSelectorSafe(page,
        'div.sites', {visible: true, timeout: TimeOut.T5S}
    );

    if (!searchEl) {
        console.log("获取参考数据区域失败");
        return false;
    }

    const searchResults = await page.evaluate(() => {
        const sites = document.querySelectorAll("div.sites > a.site");
        const data = [];
        if (sites.length === 0) {
            return data;
        }
        sites.forEach(site => {
            const link = site.getAttribute('href');
            // 提取网站名称（可能需要处理 <svg> 旁边的文本）
            const nameElement = site.querySelector('div.header span.name');
            const source = nameElement ? nameElement.textContent.trim() : '';

            // 提取标题
            const titleElement = site.querySelector('p.title');
            const title = titleElement ? titleElement.textContent.trim() : '';

            // 提取摘要/片段 (snippet)
            const snippetElement = site.querySelector('p.snippet');
            const snippet = snippetElement ? snippetElement.textContent.trim() : '';

            data.push({link, source, title, snippet});
        });

        return data;
    });

    if (searchResults.length === 0) {
        console.log("获取参考数据失败");
    }

    console.log(searchResults);

    return true;
}());