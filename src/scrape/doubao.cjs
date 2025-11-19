const {waitForSelectorSafe, waitSafe} = require("../util/wait");
async function action(page, question) {
    console.log("开始 Doubao 抓取...");

    // 查找是否有登录按钮
    const loginBtnSelector = 'button[data-testid="to_login_button"]';
    const loginBtnEl = await waitForSelectorSafe(page, loginBtnSelector, { visible: true, timeout: 10000 })

    // 通知登录态失效
    if (loginBtnEl) {
        //告警登录失效
        return;
    }

    // 等待文本输入框元素出现（最多等 5 秒）
    const textSelector = 'textarea[data-testid="chat_input_input"]';
    const textEl = await waitForSelectorSafe(page, textSelector, { visible: true, timeout: 5000 });

    if (!textEl) {
        //告警登录失效
        return;
    }

    await page.focus(textSelector);
    await page.type(textSelector, question, { delay: 50 }); // delay 毫秒，可设为 0

    // 鼠标移动模拟
    await page.mouse.move(200, 300);

    // 滚动页面
    await page.evaluate(() => window.scrollBy(0, 400));

    // 再点击发送按钮
    await page.click('#flow-end-msg-send');

    // 等待时间可以根据实际情况调整，或者或许改成判断某个元素出现更好
    await waitSafe(page, 30000);

    // 获取所有回答文本（最新那条）
    const answer = await page.evaluate(() => {
        console.log("start.....");
        const containers = [...document.querySelectorAll('.container-PvPoAn')];

        if (!containers.length) return '';

        const last = containers[containers.length - 1];
        if (!last) return '';


        const parts = [...last.querySelectorAll('div[data-testid="message_text_content"]')];
        if (!parts.length) return '';

        return parts.map(el => el.innerText.trim()).join("\n");
    });

    console.log("AI 回复：", answer);
    console.log('回答结束...');

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

    console.log(results);
}

module.exports = {
    channel: "doubao",
    action,
};