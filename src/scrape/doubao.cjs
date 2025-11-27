const {waitForSelectorSafe, waitSafe, waitForClass} = require("../util/wait.cjs");
const {AiAskDetailModel} = require('../models/index.cjs')

async function action(page, taskDetail) {
    console.log("开始 Doubao 抓取...");

    // 获取新对话的按钮
    const newChatSelector = 'div[data-testid="create_conversation_button"]';
    const newChatEl = await waitForSelectorSafe(page, newChatSelector, {visible: true, timeout: 5000});

    if (!newChatEl) {
        console.log("获取新会话按钮失败");
        return false;
    }

    await newChatEl.click();
    // 此处等待3秒，为了等待ui响应
    await waitSafe(page, 3000);
    console.log("点击新会话按钮");

    // 等待文本输入框元素出现（最多等 5 秒）
    const textSelector = 'textarea[data-testid="chat_input_input"]';
    const textEl = await waitForSelectorSafe(page, textSelector, { visible: true, timeout: 5000 });

    if (!textEl) {
        console.log("获取文本输入框失败");
        return;
    }

    await page.focus(textSelector);
    await page.type(textSelector, taskDetail.question, {delay: 50}); // delay 毫秒，可设为 0

    // 鼠标移动模拟
    await page.mouse.move(200, 300);

    // 滚动页面
    await page.evaluate(() => window.scrollBy(0, 400));

    // 再点击发送按钮
    await page.click('#flow-end-msg-send');

    // 此处等待3秒，为了等待ui响应
    await waitSafe(3000);

    // 等待时间可以根据实际情况调整，或者或许改成判断某个元素出现更好
    //await waitSafe(page, 30000);

    const sendBtnSelector = 'button[data-testid="chat_input_send_button"]';
    const sendBtnEl = await waitForSelectorSafe(page, sendBtnSelector, {visible: true, timeout: 5000});

    if (!sendBtnEl) {
        console.log("获取发送按钮失败");
        return false;
    }

    // 等待回答完成（发送按钮出现 !hidden 类）
    const isComplete = await waitForClass(
        page,
        sendBtnSelector,
        '!hidden',
        {timeout: 120000}
    );

    if (isComplete) {
        console.log("回答超时")
        return false;
    }

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

    if (answerText.length === 0) {
        console.log("抓取答案内容为空")
        return false;
    }

    //查找参考资料区域
    const searchSelector = 'div[data-testid="search-reference-ui"]';
    const searchEl = await waitForSelectorSafe(page, searchSelector, { visible: true, timeout: 5000 });

    if (!searchEl) {
        console.log("未找到搜索结果");
        return;
    }

    // 点击等待右边列表展开
    await searchEl.click();
    await waitSafe(page, 3000)

    // 抓取参考资料列表
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

    if (results.length === 0) {
        console.log("查找搜索参考失败");
        return false;
    }

    await AiAskDetailModel.updateById(taskDetail.id, {
        answer: answerText,
        search: JSON.stringify(results)
    })

    return true
}

module.exports = {
    channel: "doubao",
    action,
};