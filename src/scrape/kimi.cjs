const {waitForSelectorSafe, waitSafe, waitForStableContent} = require("../util/wait.cjs");
const {humanType, clickBlank} = require("../util/page.cjs");
const TimeOut = require("../util/timeout");

function getTextSelector() {
    // 等待文本输入框元素出现（最多等 5 秒）
    return 'div.chat-input-editor';
}

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

/**
 *
 * @param page
 * @param item {{question_content: string, id: number, ai_bot_id: number}}
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

    // 等待文本输入框元素出现（最多等 5 秒）

    await humanType(page, getTextSelector(), item.question_content);
    await waitSafe(page, TimeOut.T2S);

    // 发送前的截图 debug
    //await page.screenshot({path: process.env.PUPPETEER_SCREEN_SHOT_DIR + `/screenshot_${item.ai_bot_id}_${item.id}_1.png`});

    //点击发送按钮
    await page.keyboard.press('Enter');

    console.log(`questionText:${item.question_content}`)

    // 等待回答
    //await waitSafe(page, 60000);
    await waitForStableContent(
        page, getAnswerText, TimeOut.T30S, TimeOut.T120S
    );

    // 获取所有回答文本（最新那条）
    const answerText = await getAnswerText(page);

    //console.log("ai:" + answerText);

    if (answerText.length <= 10 || answerText === item.question_content) {
        //await clickBlank(page)
        //await page.screenshot({path: process.env.PUPPETEER_USER_QRCODE_IMG_DIR + `/screenshot_${item.id}_2.png`});
        return {success: false, msg: "获取回答内容失败"}
    }

    // kimi的搜索区域是自动展开的，不需要点击
    const searchEl = await waitForSelectorSafe(page,
        'div.sites', {visible: true, timeout: TimeOut.T5S}
    );

    if (!searchEl) {
        // 如果没获取到参考资料区域，也更算是成功。
        return {success: true, msg: "没有参考数据", result: {answer: answerText, search: ""}};
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
            const source = nameElement ? nameElement.textContent.trim() : 'N/A';

            // 提取标题
            const titleElement = site.querySelector('p.title');
            const title = titleElement ? titleElement.textContent.trim() : 'N/A';

            // 提取摘要/片段 (snippet)
            const snippetElement = site.querySelector('p.snippet');
            const snippet = snippetElement ? snippetElement.textContent.trim() : 'N/A';

            data.push({link, source, title, snippet});
        });

        return data;
    });

    if (searchResults.length === 0) {
        return {success: true, msg: "获取参考数据失败", result: {answer: answerText, search: ""}};
    }

    return {success: true, msg: "操作成功", result: {answer: answerText, search: JSON.stringify(searchResults)}};
}

module.exports = {
    channel: "kimi",
    action,
    getTextSelector,
};