const {waitSafe} = require("./wait.cjs");

async function clickBlank(page) {
    const {width, height} = await page.evaluate(() => {
        return {
            width: document.documentElement.clientWidth,
            height: document.documentElement.clientHeight,
        };
    });

    // 计算一个点击坐标，例如点击页面中心附近
    // Puppeteer 的坐标是相对于视口左上角 (0, 0) 的 CSS 像素
    const clickX = Math.floor(width / 2); // 屏幕宽度的一半
    const clickY = Math.floor(height / 2); // 屏幕高度的一半
    console.log(`点击坐标: (${clickX}, ${clickY})`);
    // 模拟鼠标点击这个坐标
    await page.mouse.click(clickX, clickY);
}

async function realClick(page, selector) {
    const el = await page.waitForSelector(selector, {visible: true});

    const box = await el.boundingBox();
    if (!box) return;

    // 移到元素中间位置，模拟真实轨迹
    await page.mouse.move(
        box.x + box.width / 2,
        box.y + box.height / 2,
        {steps: 25}
    );

    await page.mouse.down();
    await waitSafe(page, 50 + Math.random() * 100);
    await page.mouse.up();
}

async function humanType(page, selector, text) {
    await page.waitForSelector(selector);
    await page.click(selector);

    await page.evaluate((selector) => {
        const el = document.querySelector(selector);
        el.value = "";
    }, selector);

    for (const char of text) {
        await page.evaluate((selector, char) => {
            const el = document.querySelector(selector);
            el.value += char;
            el.dispatchEvent(new Event('input', {bubbles: true}));
        }, selector, char);

        // 随机延迟，模拟真人
        await waitSafe(20 + Math.random() * 80);
    }

    // FINAL：触发最终输入事件
    await page.evaluate((selector) => {
        const el = document.querySelector(selector);
        el.dispatchEvent(new Event('change', {bubbles: true}));
    }, selector);
}

module.exports = {
    clickBlank,
    realClick,
    humanType
}