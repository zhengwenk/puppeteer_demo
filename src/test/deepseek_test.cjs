const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const {executablePath} = require('puppeteer');
const {yargs} = require('yargs');

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

function getQuestionText() {
    const args = process.argv.slice(2);
    if (args.length > 0) {
        return args[0];
    }
}

(async function () {
    const questionText = getQuestionText();

    if (!questionText) {
        console.log("请提供问题文本作为命令行参数");
        return;
    }

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
        userDataDir: process.env.PUPPETEER_CHROME_USER_DATA_DIR + "/honghong",
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

    const targetUrl = "https://chat.deepseek.com";
    await page.goto(targetUrl, {waitUntil: 'domcontentloaded', timeout: 20000});

    // 等待文本输入框元素出现（最多等 5 秒）
    const textSelector = 'textarea';
    let textEl = await waitForSelectorSafe(page, textSelector, {visible: true, timeout: 10000});

    if (!textEl) {
        await page.reload({waitUntil: 'domcontentloaded'});
        await waitSafe(3000);
        // 等待文本输入框元素出现（最多等 5 秒）
        textEl = await waitForSelectorSafe(page, textSelector, {visible: true, timeout: 10000});
        if (!textEl) {
            return {success: false, msg: "获取文本框失败"}
        }
    }

    await page.focus(textSelector);
    //await page.click(textSelector);
    await page.type(textSelector, questionText, {delay: 50}); // delay 毫秒，可设为 0
    await page.mouse.move(200, 300);
    await page.evaluate(() => window.scrollBy(0, 400));
    await waitSafe(2000);

    // 判断联网搜索的开关是否开启
    // 等待联网搜索开关的父元素元素加载
    await waitForSelectorSafe(page, 'div.ec4f5d61', {visible: true, timeout: 5000});

    // 获取父元素下的第二个 button
    const isSelected = await page.evaluate(() => {
        const parent = document.querySelector('div.ec4f5d61');
        if (!parent) return 0;

        const buttons = parent.querySelectorAll('button');
        if (buttons.length < 2) return 0;

        const secondBtn = buttons[1]; // 第二个 button，索引从 0 开始
        if (secondBtn.classList.contains('ds-toggle-button--selected')) {
            return 2;
        } else {
            secondBtn.click();
            return 1;
        }
    });

    console.log('第二个 button 是否选中：', isSelected);
    await waitSafe(1000);

    //点击发送按钮
    await page.click('div.ds-icon-button._7436101');

    // 等待30s
    await waitSafe(page, 60000);

    // 获取所有回答文本（最新那条）
    const answerText = await page.evaluate(() => {
        const root = document.querySelector('.ds-markdown');
        if (!root) return "";

        // 遍历子节点，保留阅读顺序
        function extract(node) {
            let result = "";

            // 如果是文本节点 → 取内容
            if (node.nodeType === Node.TEXT_NODE) {
                return node.textContent.trim() + " ";
            }

            // 如果是元素 → 遍历子元素
            if (node.nodeType === Node.ELEMENT_NODE) {
                // 表格也会被当成普通元素处理
                for (const child of node.childNodes) {
                    result += extract(child);
                }
            }

            return result;
        }

        const answer = extract(root)
            .replace(/\s+/g, " ")  // 去重空白
            .trim();
        // console.log("start.....");
        // const containers = [...document.querySelectorAll('.dad65929 .ds-message')];
        // if (!containers.length) return '';
        // console.log(containers);
        // const last = containers[containers.length - 1];
        // if (!last) return '';
        // console.log(last);
        //
        // const parts = [...last.querySelectorAll('.ds-markdown-paragraph')];
        // if (!parts.length) return '';
        //
        // console.log(parts);
        //
        // const answer = parts.map(el => el.innerText.trim()).join("\n");

        const searchResultBtn = document.getElementsByClassName('f93f59e4')[0];
        console.log(searchResultBtn);
        if (searchResultBtn) {
            searchResultBtn.click();
        }

        return answer
    });

    console.log("AI 回复：", answerText);

    if (answerText.length <= 10 || answerText === questionText) {
        //await clickBlank(page)
        await page.screenshot({
            path: `${process.env.PUPPETEER_USER_QRCODE_IMG_DIR}/screenshot_test_2.png`,
        });

        console.log("获取内容失败");
    }

    const searchEl = await waitForSelectorSafe(page,
        'div.dc433409 a._24fe229', {visible: true, timeout: 5000}
    );

    if (!searchEl) {
        // 如果没获取到参考资料区域，也更算是成功。
        console.log("获取搜索内容失败");

    } else {
        // 抓取数据
        const results = await page.evaluate(() => {
            const list = document.querySelectorAll('div.dc433409 a._24fe229');
            return Array.from(list).map(a => {
                const title = a.querySelector('div.search-view-card__title')?.innerText.trim() || '';
                const snippet = a.querySelector('div.search-view-card__snippet')?.innerText.trim() || '';
                const source = a.querySelector('span.d2eca804')?.innerText.trim() || '';
                const date = a.querySelector('span.caa1ee14')?.innerText.trim() || '';
                const link = a.href;

                return {title, snippet, source, date, link};
            });
        });

        console.log(results);
    }

    //await browser.close();

})();

