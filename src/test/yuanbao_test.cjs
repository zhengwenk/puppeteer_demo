const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const {executablePath} = require('puppeteer');
const {waitForSelectorSafe, waitSafe} = require("../util/wait.cjs");

puppeteer.use(StealthPlugin());

(async function () {
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
        userDataDir: process.env.PUPPETEER_CHROME_USER_DATA_DIR + "/zhengwenkai",
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

    const targetUrl = "https://yuanbao.tencent.com/chat";
    await page.goto(targetUrl, {waitUntil: 'domcontentloaded', timeout: 20000});

    // 等待编辑器出现
    const editorSelector = 'div.ql-editor';
    const editor = await page.waitForSelector(editorSelector, {visible: true, timeout: 10000});

    // 1聚焦到编辑器
    await editor.focus();

    // 2 输入文本
    const message = "帮我写一篇去韩国旅游的详细攻略，包含景点、美食、住宿和交通，一家四口出行。";
    await page.keyboard.type(message, {delay: 50}); // delay 模拟人工输入

    // 3 模拟按下 Enter 发送
    await page.keyboard.press('Enter');

    console.log('等待回答结束...');

    // 等待一会儿查看效果
    await waitSafe(page, 60000);

    // 获取所有回答文本（最新那条）
    const answer = await page.evaluate(() => {
        console.log("start.....");
        const containers = [...document.querySelectorAll('.agent-chat__list__item--ai')];
        if (!containers.length) return '';
        console.log(containers);
        const last = containers[containers.length - 1];
        if (!last) return '';
        console.log(last);

        const parts = [...last.querySelectorAll('.ybc-p')];
        if (!parts.length) return '';

        console.log(parts);

        return parts.map(el => el.innerText.trim()).join("\n");
    });

    console.log("AI 回复：", answer);

    const searchReferenceSelector = 'div.agent-chat__search-guid-tool';
    const searchEl = await waitForSelectorSafe(page, searchReferenceSelector, {visible: true, timeout: 5000});

    if (!searchEl) {
        console.log("未找到了参考资料区域");
        return true
    } else {
        await searchEl.click()
        await waitSafe(page, 3000);
        const searchResults = await page.evaluate(() => {
            const data = [];
            // 目标列表容器的选择器
            const listSelector = '.agent-dialogue-references__list';
            const referenceItems = document.querySelectorAll(`${listSelector} > li.agent-dialogue-references__item`);
            if (referenceItems.length === 0) {
                return data;
            }

            referenceItems.forEach(item => {
                // 1. URL (href) 从 .hyc-common-markdown__ref_card 的 data-url 属性获取
                let url = item.querySelector('.hyc-common-markdown__ref_card').getAttribute('data-url');

                // 2. 网站名称 (name)
                // 尝试从卡片底部的 source_txt 获取完整的文本，包括“公众号”标识
                const websiteNameElement = item.querySelector('.hyc-common-markdown__ref_card-foot__source_txt');
                let websiteName = '';
                if (websiteNameElement) {
                    // 检查是否存在公众号的结构，如果有，则拼接“公众号”和名称
                    const sourceTxt = websiteNameElement.textContent.trim();
                    const isOfficialAccount = item.querySelector('.hyc-common-markdown__ref_card-foot__txt span:first-child')?.textContent.trim() === '公众号';

                    if (isOfficialAccount) {
                        // 提取公众号名称，并拼接“ (公众号)”
                        // 如果 sourceTxt 是 '·AI终身学习'，则提取 'AI终身学习'
                        const namePart = sourceTxt.startsWith('·') ? sourceTxt.substring(1).trim() : sourceTxt;
                        websiteName = namePart + ' (公众号)';
                    } else {
                        // 对于非公众号，直接使用其文本内容
                        websiteName = sourceTxt;
                    }
                } else {
                    // 备用：从 dt-ext3 属性获取（通常是简短的名称）
                    websiteName = item.getAttribute('dt-ext3') || '';
                }


                // 3. 标题 (title)
                const titleElement = item.querySelector('.hyc-common-markdown__ref_card-title span');
                let title = titleElement ? titleElement.textContent.trim() : '';

                // 4. 摘要 (summary)
                const summaryElement = item.querySelector('.hyc-common-markdown__ref_card-desc');
                let summary = summaryElement ? summaryElement.textContent.trim() : '';

                data.push({
                    url: url,
                    name: websiteName,
                    title: title,
                    summary: summary
                });
            });

            return data;
        });

        if (searchResults.length === 0) {
            console.log("获取参考数据失败");
        }

        console.log(searchResults);
        return true;
    }

}());