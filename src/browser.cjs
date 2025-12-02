// browser.js
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { executablePath } = require('puppeteer');

puppeteer.use(StealthPlugin());

const UAPool = [
    // 主流 2024-2025 PC UA
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 12.6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
];

async function createBrowser(options = {}) {
    return await puppeteer.launch({
        headless: options.headless,
        defaultViewport: {width: options.viewport.w, height: options.viewport.h},
        args: [
            '--start-maximized',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            // 常用以减少 headless 标志的线索（并非万无一失）
            '--disable-blink-features=AutomationControlled',
            '--enable-unsafe-swiftshader',

            ...(options.args || [])
        ],
        executablePath: options.executablePath || executablePath(),
        userDataDir: options.userDataDir || undefined,
    });
}

async function createPage(browser) {
    const page = await browser.newPage();

    // 随机 UA
    //await page.setUserAgent(randomUA());

    // 随机 Viewport
    //await page.setViewport(randomViewport());

    // Accept-Language
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'zh-CN,zh;q=0.9',
    });

    // 修复 navigator.plugins / languages
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3],
        });
        Object.defineProperty(navigator, 'languages', {
            get: () => ['zh-CN', 'zh'],
        });
    });

    // await page.authenticate({
    //     username: 't9cvmd',
    //     password: 'rmbeu3jq'
    // });

    return page;
}

function randomViewport() {
    const devices = [
        {w: 1680, h: 1050},
        {w: 1536, h: 864},
        {w: 1366, h: 768},
        {w: 1440, h: 900},
    ];

    return devices[Math.floor(Math.random() * devices.length)]
}

function randomUA() {
    return UAPool[Math.floor(Math.random() * UAPool.length)];
}

async function humanMouseMove(page, selector = null) {
    let target;

    if (selector) {
        target = await page.$(selector);
        if (!target) return;
        const box = await target.boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
            steps: 25 + Math.floor(Math.random() * 10)
        });
    } else {
        // 随机移动
        await page.mouse.move(
            Math.floor(Math.random() * 300 + 50),
            Math.floor(Math.random() * 300 + 50),
            {steps: 30}
        );
    }
}

module.exports = {
    createBrowser,
    createPage,
    randomViewport,
    randomUA,
    humanMouseMove
};