const {waitForSelectorSafe, waitSafe, waitForStableContent} = require("../util/wait.cjs");
const {humanType, clickBlank} = require("../util/page.cjs");
const TIMEOUT = require('../util/timeout.cjs');

function getTextSelector() {
    // 等待文本输入框元素出现（最多等 5 秒）
    return 'textarea';
}

/**
 *
 * @param page
 * @param item {{question_content: string, id: number}}
 * @returns {Promise<{success: boolean, msg: string}|{success: boolean, msg: string, result: {answer: *, search: string}}>}
 */
async function action(page, item) {
    // //获取新对话的按钮
    // const newChatSelector = 'div[data-testid="create_conversation_button"]';
    // const newChatEl = await waitForSelectorSafe(page, newChatSelector, {visible: true, timeout: 5000});
    //
    // if (!newChatEl) {
    //     return {success: false, msg: "获取新会话按钮失败"}
    // }
    //
    // await Promise.all([
    //     page.waitForNavigation({waitUntil: 'domcontentloaded'}),
    //     page.click(newChatSelector)
    // ]);

    await humanType(page, getTextSelector(), item.question_content);
    console.log(`questionText:${item.question_content}`)
    await waitSafe(TIMEOUT.T3S);

    //await page.screenshot({path: process.env.PUPPETEER_SCREEN_SHOT_DIR + `/screenshot_${item.id}_1.png`});

    // 判断联网搜索的开关是否开启
    // 等待联网搜索开关的父元素元素加载
    await waitForSelectorSafe(
        page, 'div.ec4f5d61', {visible: true, timeout: TIMEOUT.T5S}
    );

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
    await waitSafe(page, TIMEOUT.T3S);

    //点击发送按钮
    await page.click('div.ds-icon-button._7436101');
    //await waitSafe(page, TIMEOUT.T120S);

    await waitForStableContent(
        page, '.ds-markdown', TIMEOUT.T30S, TIMEOUT.T80S
    );

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

        const searchResultBtn = document.getElementsByClassName('f93f59e4')[0];

        if (searchResultBtn) {
            searchResultBtn.click();
        }

        return answer
    });

    //console.log("ai:" + answerText);

    if (answerText.length <= 10 || answerText === item.question_content) {
        //await clickBlank(page)
        //await page.screenshot({path: process.env.PUPPETEER_SCREEN_SHOT_DIR + `/screenshot_${item.ai_bot_id}_${item.id}_2.png`});
        return {success: false, msg: "获取回答内容失败"}
    }

    const searchEl = await waitForSelectorSafe(
        page,
        'div.dc433409 a._24fe229',
        {visible: true, timeout: TIMEOUT.T5S}
    );

    if (!searchEl) {
        // 如果没获取到参考资料区域，也更算是成功。
        return {
            success: true,
            msg: "没有参考数据",
            result: {answer: answerText, search: ""}
        };
    }

    // 抓取数据
    const searchResults = await page.evaluate(() => {
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

    if (searchResults.length === 0) {
        return {
            success: true,
            msg: "获取参考数据失败",
            result: {answer: answerText, search: ""}
        };
    }

    return {
        success: true,
        msg: "操作成功",
        result: {answer: answerText, search: JSON.stringify(searchResults)}
    };
}

module.exports = {
    channel: "deepseek",
    action,
    getTextSelector,
};