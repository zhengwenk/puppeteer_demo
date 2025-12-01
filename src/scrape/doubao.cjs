const {waitForSelectorSafe, waitSafe, waitForClass} = require("../util/wait.cjs");
const {humanType, clickBlank} = require("../util/page.cjs");


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
    const textSelector = 'textarea[data-testid="chat_input_input"]';
    const textEl = await waitForSelectorSafe(page, textSelector, { visible: true, timeout: 5000 });

    if (!textEl) {
        return {success: false, msg: "获取文本框失败"}
    }

    await humanType(page, textSelector, item.question_content);
    console.log(`questionText:${item.question_content}`)

    //点击发送按钮
    await page.click('#flow-end-msg-send');

    // 此处等待3秒，为了等待ui响应.由于headless模式下不太稳定，改为等待更长时间
    //await waitSafe(3000);

    // 等待时间可以根据实际情况调整，或者或许改成判断某个元素出现更好
    // 等待特定元素在headless模式下始终无法检测到变化，暂时还是固定等待60秒
    //await waitSafe(page, 60000);

    // const sendBtnSelector = 'div[data-testid="chat_input_local_break_button"]';
    // const sendBtnEl = await waitForSelectorSafe(page, sendBtnSelector, {visible: true, timeout: 5000});
    //
    // if (!sendBtnEl) {
    //     console.log("获取发送按钮失败");
    //     return false;
    // }
    //
    // // 等待回答完成（发送按钮出现 !hidden 类）
    // const isComplete = await waitForClass(
    //     page,
    //     sendBtnSelector,
    //     '!hidden',
    //     {timeout: 120000}
    // );

    // if (isComplete) {
    //     console.log("回答超时")
    //     return false;
    // }

    //查找参考资料区域
    const searchSelector = 'div[data-testid="search-reference-ui"]';
    const searchEl = await waitForSelectorSafe(
        page, searchSelector, {visible: true, timeout: 60000}
    );

    // 获取所有回答文本（最新那条）
    const answerText = await page.evaluate(() => {
        console.log("start.....");
        const containers = [...document.querySelectorAll('.container-PvPoAn')];

        if (!containers.length) return '';

        const last = containers[containers.length - 1];
        if (!last) return '';


        const parts = [...last.querySelectorAll('div[data-testid="message_text_content"]')];
        if (!parts.length) return '';

        return parts.map(el => el.innerText.trim()).join("\n");
    });

    if (answerText.length <= 10 || answerText === item.question_content) {
        await clickBlank(page)
        await page.screenshot({path: process.env.PUPPETEER_USER_QRCODE_IMG_DIR + `/screenshot_${item.id}.png`});
        return {success: false, msg: "获取回答内容失败"}
    }

    if (!searchEl) {
        //console.log("未找到搜索结果");
        // 如果没获取到参考资料区域，也更算是成功。
        return {success: true, msg: "没有参考数据", result: {answer: answerText, search: ""}};
    } else {
        // 点击等待右边列表展开
        await searchEl.click();
        await waitSafe(page, 3000)

        // 抓取参考资料列表
        const searchResults = await page.evaluate(() => {
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

        if (searchResults.length === 0) {
            return {success: true, msg: "获取参考数据失败", result: {answer: answerText, search: ""}};
        }

        return {success: true, msg: "操作成功", result: {answer: answerText, search: JSON.stringify(searchResults)}};
    }
}

module.exports = {
    channel: "doubao",
    action,
};