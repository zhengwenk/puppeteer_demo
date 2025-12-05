const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const {executablePath} = require('puppeteer');

puppeteer.use(StealthPlugin());

async function waitSafe(page, ms) {
    if (page && typeof page.waitForTimeout === 'function') {
        return page.waitForTimeout(ms);
    }
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForSelectorSafe(page, selector, options = {timeout: 5000}) {
    try {
        const el = await page.waitForSelector(selector, options);
        console.log(`找到元素: ${selector}`);
        return el;
    } catch (err) {
        console.log(`未找到元素: ${selector}，原因: ${err.message}`);
        return null;
    }
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

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    const targetUrl = "https://www.kimi.com";
    await page.goto(targetUrl, {waitUntil: 'domcontentloaded', timeout: 20000});

    const textSelector = 'div.chat-input-editor';
    const textEl = await page.waitForSelector(textSelector, {visible: true, timeout: 5000});

    if (!textEl) {
        return {success: false, msg: "获取文本框失败"}
    }

    const text = '帮我写一篇去韩国旅游的详细攻略，包含景点、美食、住宿和交通，一家四口出行。';
    await page.focus(textSelector);
    //await page.click(textSelector);
    await page.type(textSelector, text, {delay: 50}); // delay 毫秒，可设为 0
    await page.mouse.move(200, 300);
    await page.evaluate(() => window.scrollBy(0, 400));
    await waitSafe(2000);

    //点击发送按钮
    await page.keyboard.press('Enter');

    // 等待回答
    await waitSafe(page, 30000);

    // 获取所有回答文本（最新那条）
    const answerText = await page.evaluate(() => {
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

    console.log("ai:" + answerText);

    // kimi的搜索区域是自动展开的，不需要点击
    const searchEl = await waitForSelectorSafe(page,
        'div.sites', {visible: true, timeout: 5000}
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
            const url = site.getAttribute('href');
            // 提取网站名称（可能需要处理 <svg> 旁边的文本）
            const nameElement = site.querySelector('div.header span.name');
            const name = nameElement ? nameElement.textContent.trim() : 'N/A';

            // 提取标题
            const titleElement = site.querySelector('p.title');
            const title = titleElement ? titleElement.textContent.trim() : 'N/A';

            // 提取摘要/片段 (snippet)
            const snippetElement = site.querySelector('p.snippet');
            const snippet = snippetElement ? snippetElement.textContent.trim() : 'N/A';

            data.push({url, name, title, snippet});
        });

        return data;
    });

    if (searchResults.length === 0) {
        console.log("获取参考数据失败");
    }

    console.log(searchResults);
    return true;
}());