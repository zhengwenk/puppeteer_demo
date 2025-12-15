const {waitForSelectorSafe, waitSafe, waitForStableContent} = require("../util/wait.cjs");
const {humanType, clickBlank} = require("../util/page.cjs");
const TimeOut = require("../util/timeout.cjs");


function getTextSelector() {
    // 等待文本输入框元素出现（最多等 5 秒）
    return 'div.ql-editor';
}

async function getAnswerText(page) {
    return await page.evaluate(() => {
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
    // const textSelector = 'div.ql-editor';
    // const textEl = await page.waitForSelector(textSelector, {visible: true, timeout: 10000});
    //
    // if (!textEl) {
    //     return {success: false, msg: "获取文本框失败"}
    // }


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

    console.log('等待回答结束...');

    // 获取所有回答文本（最新那条）
    const answerText = await getAnswerText(page)

    //console.log("ai:" + answerText);

    if (answerText.length <= 10 || answerText === item.question_content) {
        //await clickBlank(page)
        //await page.screenshot({path: process.env.PUPPETEER_USER_QRCODE_IMG_DIR + `/screenshot_${item.id}_2.png`});
        return {success: false, msg: "获取回答内容失败"}
    }

    const searchReferenceSelector = 'div.agent-chat__search-guid-tool';
    const searchReferenceEl = await waitForSelectorSafe(
        page, searchReferenceSelector,
        {visible: true, timeout: TimeOut.T5S}
    );

    if (!searchReferenceEl) {
        return {success: true, msg: "获取参考数据按钮失败", result: {answer: answerText, search: ""}};
    }

    await searchReferenceEl.click()
    await waitSafe(page, TimeOut.T3S);

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
                link: url,
                source: websiteName,
                title: title,
                snippet: summary
            });
        });

        return data;
    });

    if (searchResults.length === 0) {
        return {success: true, msg: "获取参考数据失败", result: {answer: answerText, search: ""}};
    }

    return {success: true, msg: "操作成功", result: {answer: answerText, search: JSON.stringify(searchResults)}};
}

module.exports = {
    channel: "yuanbao",
    action,
    getTextSelector,
};