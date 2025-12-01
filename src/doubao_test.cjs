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
        headless: "new",
        //headless: false,
        devtools: false,
        //defaultViewport: null,
        defaultViewport: {width: 1440, height: 900},
        args: [
            '--start-maximized',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            // 常用以减少 headless 标志的线索（并非万无一失）
            '--disable-blink-features=AutomationControlled',
            //'--proxy-server=http://114.80.161.93:62000'
        ],
        executablePath: executablePath(), // 指向系统 Chrome（可替换为你的 Chrome 路径）
        userDataDir: process.env.PUPPETEER_CHROME_USER_DATA_DIR + "/abc",
    });

    // 打开新的页面
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    const targetUrl = "https://www.doubao.com/chat/";
    await page.goto(targetUrl, {waitUntil: 'domcontentloaded', timeout: 20000});

    // 等待文本输入框元素出现（最多等 10秒）
    const textSelector = 'textarea[data-testid="chat_input_input"]';
    const textEl = await page.waitForSelector(textSelector, {visible: true, timeout: 10000});


    if (textEl) {
        // 可选：聚焦并清空（如果已有默认内容）
        await page.focus(textSelector);
        const textToType = '我想去韩国，给我一个详细攻略。一家四口。'; // 输入内容
        await page.type(textSelector, textToType, {delay: 50}); // delay 毫秒，可设为 0
        await waitSafe(page, 3000);
    }

    //await page.screenshot({path: process.env.PUPPETEER_USER_QRCODE_IMG_DIR + '/screenshot1.png'});

    // 鼠标移动模拟
    await page.mouse.move(200, 300);

    // 滚动页面
    await page.evaluate(() => window.scrollBy(0, 400));

    // 再点击发送按钮
    await page.click('#flow-end-msg-send');

    //await waitSafe(page, 10000);

    // await page.mouse.move(200, 300);
    //
    // // 获取当前视口的宽度和高度
    // const {width, height} = await page.evaluate(() => {
    //     return {
    //         width: document.documentElement.clientWidth,
    //         height: document.documentElement.clientHeight,
    //     };
    // });

    // // 计算一个点击坐标，例如点击页面中心附近
    // // Puppeteer 的坐标是相对于视口左上角 (0, 0) 的 CSS 像素
    // const clickX = Math.floor(width / 2); // 屏幕宽度的一半
    // const clickY = Math.floor(height / 2); // 屏幕高度的一半
    // console.log(`点击坐标: (${clickX}, ${clickY})`);
    // // 模拟鼠标点击这个坐标
    // await page.mouse.click(clickX, clickY);
    //
    // await page.screenshot({path: process.env.PUPPETEER_USER_QRCODE_IMG_DIR + '/screenshot2.png'});

    await waitSafe(page, 20000);

    //await page.screenshot({path: process.env.PUPPETEER_USER_QRCODE_IMG_DIR + '/screenshot3.png'});

    //return;
    console.log('回答结束,开始获取内容');

    // 获取所有回答文本（最新那条）
    const answer = await page.evaluate(() => {
        console.log("start.....");
        const containers = [...document.querySelectorAll('.container-PvPoAn')];
        if (!containers.length) return '';
        console.log(containers);
        const last = containers[containers.length - 1];
        if (!last) return '';
        console.log(last);

        const parts = [...last.querySelectorAll('div[data-testid="message_text_content"]')];
        if (!parts.length) return '';

        console.log(parts);

        return parts.map(el => el.innerText.trim()).join("\n");
    });

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
                // 搜索子元素 class 以 "footer-title-" 开头
                const footerEl = item.querySelector('[class*="footer-title-"]');

                const linkEl = item.querySelector('a');

                return {
                    title: titleEl ? titleEl.innerText.trim() : null,
                    footer: footerEl ? footerEl.innerText.trim() : null,
                    link: linkEl ? linkEl.href.trim() : null
                };
            });
        });

        console.log(results);
    }

    await browser.close();

})();