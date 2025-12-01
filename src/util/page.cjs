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
    if (!box) {
        console.log(`元素不可见，无法点击: ${selector}`);
        return;
    }

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

async function humanType(page, textSelector, text) {
    await page.focus(textSelector);
    await page.type(textSelector, text, {delay: 50}); // delay 毫秒，可设为 0
    await page.mouse.move(200, 300);
    await page.evaluate(() => window.scrollBy(0, 400));
}

module.exports = {
    clickBlank,
    realClick,
    humanType
}