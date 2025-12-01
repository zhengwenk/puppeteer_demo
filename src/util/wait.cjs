// utils/wait.js
async function waitSafe(page, ms) {
    if (page && typeof page.waitForTimeout === 'function') {
        return page.waitForTimeout(ms);
    }
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForSelectorSafe(page, selector, options = { timeout: 5000 }) {
    try {
        return await page.waitForSelector(selector, options);
    } catch (err) {
        console.log(`未找到元素: ${selector}，原因: ${err.message}`);
        return null;
    }
}

/**
 * 等待某个元素的 class 变化
 *
 * @param {Page} page Puppeteer page 实例
 * @param {string} selector 需要监测的 CSS selector
 * @param {string} className 需判断的 class 名称（例如 "!hidden"）
 * @param {Object} options { appear: true/false, timeout: 毫秒 }
 */
async function waitForClass(page, selector, className, options = {}) {
    const {
        appear = true,            // true = class 要出现, false = class 要消失
        timeout = 10000,          // 默认 10 秒
        polling = 'mutation'      // 默认用 MutationObserver，更智能
    } = options;

    const condition = appear
        ? // 等待 class 出现
        () => {
            const el = document.querySelector(selector);
            return el && el.classList.contains(className);
        }
        : // 等待 class 消失
        () => {
            const el = document.querySelector(selector);
            return el && !el.classList.contains(className);
        };

    try {
        const waitEl = await page.waitForFunction(condition, {timeout, polling});
        console.log(`元素 ${selector} 的 class "${className}" 已${appear ? '出现' : '消失'}`);
        return waitEl
    } catch (err) {
        console.log(`等待元素 ${selector} 的 class "${className}" 变化超时: ${err.message}`);
        return null;
    }
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
    await page.focus(selector);

    for (const char of text) {
        await page.keyboard.type(char, {delay: 30 + Math.random() * 80});
    }
}

module.exports = {
    waitSafe,
    waitForSelectorSafe,
    waitForClass,
    realClick,
    humanType
};