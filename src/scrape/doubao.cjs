const {waitForSelectorSafe, waitSafe, waitForClass} = require("../util/wait.cjs");
const {humanType, clickBlank} = require("../util/page.cjs");
const {waitForStableContent} = require("../util/wait");
const TimeOut = require("../util/timeout");

function getTextSelector() {
    // 等待文本输入框元素出现（最多等 5 秒）
    return 'textarea[data-testid="chat_input_input"]';
}

async function getAnswerText(page) {
    return await page.evaluate(() => {

        const containers = [...document.querySelectorAll('.container-PvPoAn')];
        if (!containers.length) return '';

        const last = containers[containers.length - 1];
        if (!last) return '';


        const parts = [...last.querySelectorAll('div[data-testid="message_text_content"]')];
        if (!parts.length) return '';

        console.log(parts);

        return parts.map(el => el.innerText.trim()).join("\n");
    });
}

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
    await waitSafe(page, TimeOut.T2S);

    //await page.screenshot({path: process.env.PUPPETEER_SCREEN_SHOT_DIR + `/screenshot_${item.ai_bot_id}_${item.id}_1.png`});

    //点击发送按钮
    await page.click('#flow-end-msg-send');

    console.log(`questionText:${item.question_content}`)

    // 等待回答区域内容为定不变化
    await waitForStableContent(
        page, getAnswerText, TimeOut.T30S, TimeOut.T120S
    );

    //查找参考资料区域
    const searchSelector = 'div[data-testid="search-reference-ui"]';
    const searchEl = await waitForSelectorSafe(
        page, searchSelector, {visible: true, timeout: TimeOut.T5S}
    );

    // 获取所有回答文本（最新那条）
    const answerText = await getAnswerText(page);

    if (answerText.length <= 10 || answerText === item.question_content) {
        //await clickBlank(page)
        //await page.screenshot({path: process.env.PUPPETEER_SCREEN_SHOT_DIR + `/screenshot_${item.ai_bot_id}_${item.id}_2.png`});
        return {success: false, msg: "获取回答内容失败"}
    }

    if (!searchEl) {
        //console.log("未找到搜索结果");
        // 如果没获取到参考资料区域，也更算是成功。
        return {
            success: true, msg: "没有参考数据",
            result: {answer: answerText, search: ""}
        };
    } else {
        // 点击等待右边列表展开
        await searchEl.click();
        await waitSafe(page, TimeOut.T3S)

        // 抓取参考资料列表
        const searchResults = await page.evaluate(() => {
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

        if (searchResults.length === 0) {
            return {
                success: true, msg: "获取参考数据失败",
                result: {answer: answerText, search: ""}
            };
        }

        return {
            success: true, msg: "操作成功",
            result: {answer: answerText, search: JSON.stringify(searchResults)}
        };
    }
}

module.exports = {
    channel: "doubao",
    action,
    getTextSelector
};