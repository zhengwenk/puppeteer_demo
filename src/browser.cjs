// browser.js
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { executablePath } = require('puppeteer');

puppeteer.use(StealthPlugin());

async function createBrowser(options = {}) {
    return await puppeteer.launch({
        headless: options.headless,
        defaultViewport: {
            width: 1512,          // 逻辑视口宽度 (Mac 默认缩放)
            height: 982,         // 逻辑视口高度 (Mac 默认缩放)
            deviceScaleFactor: 2, // 启用 HiDPI 渲染
            isMobile: false
        },
        args: [
            '--start-maximized',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            // 常用以减少 headless 标志的线索（并非万无一失）
            '--disable-blink-features=AutomationControlled',
            ...(options.args || [])
        ],
        executablePath: options.executablePath || executablePath(),
        userDataDir: options.userDataDir || undefined,
    });
}

module.exports = {
    createBrowser,
};