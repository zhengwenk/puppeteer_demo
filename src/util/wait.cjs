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

async function waitForGotoSafe(page, url, options = {}) {
    const {
        waitSelector = null,       // 需要等待的关键元素
        gotoTimeout = 30000,       // goto 超时
        selectorTimeout = 15000    // selector 超时
    } = options;

    function tag(promise, tagName) {
        return promise.then(
            (value) => ({ok: true, tag: tagName, value}),
            (error) => ({ok: false, tag: tagName, error})
        );
    }

    const tasks = [
        tag(page.goto(url, {waitUntil: 'networkidle2', timeout: gotoTimeout}), 'goto')
    ];

    if (waitSelector) {
        const selectorStr = typeof waitSelector === 'function' ? waitSelector(page) : waitSelector;
        tasks.push(
            tag(waitForSelectorSafe(page, selectorStr, {visible: true, timeout: selectorTimeout}), 'selector')
        );
    }

    return await Promise.race(tasks); // 统一返回格式：{ ok, tag, value?, error? }
}

// 等待某个容器内的内容稳定下来，即在 stableMs 时间内不再变化
async function waitForStableContent(page, selector, stableMs = 1500, timeout = 20000) {
    //起始时间
    const start = Date.now();

    // 上一次内容
    let lastText = "";

    // 上一次内容变化时间
    let lastChangeTime = Date.now();

    while (true) {
        // 查询容器内的内容
        const text = await page.$eval(selector, el => el.innerText.trim()).catch(() => "");

        // 内容有变化
        if (text !== lastText) {
            lastText = text;
            lastChangeTime = Date.now(); // 内容刚刚更新
        }

        // 内容稳定了一段时间
        if (Date.now() - lastChangeTime >= stableMs) {
            return;
        }

        // 超时保护
        if (Date.now() - start > timeout) {
            return;
        }

        await waitSafe(page, 3000)
    }
}


module.exports = {
    waitSafe,
    waitForSelectorSafe,
    waitForClass,
    waitForGotoSafe,
    waitForStableContent
};