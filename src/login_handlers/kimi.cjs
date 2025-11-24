const {waitSafe, waitForSelectorSafe} = require("../util/wait.cjs");


async function checkLogin(page, nickname = "") {
    const nicknameTextSelector = 'span.user-name';
    const nicknameTextEl = await waitForSelectorSafe(page, nicknameTextSelector, {visible: true, timeout: 15000});

    if (!nicknameTextEl) {
        console.log("登录失败，未找到nickname文本");
        return false;
    }

    const nicknameText = await nicknameTextEl.evaluate(n => n.innerText);

    console.log("nickname:", nicknameText);

    if (nicknameText && nicknameText.trim() === nickname) {
        console.log("nicknameText");
        return true;
    }

    return false;
}

async function doLogin(page, aiAccount) {
    console.log("开始 kimi 登录...");

    // 登录按钮选择
    const loginBtnSelector = 'div.not-login-container';
    const loginBtnEl = await waitForSelectorSafe(page, loginBtnSelector, {visible: true, timeout: 10000});

    if (!loginBtnEl) {
        console.log("为查找到登录按钮，可能已经登录，进行登录状态检查...");
        return checkLogin(page, aiAccount.nickname);
    } else {
        console.log("找到登录按钮，进行点击登录...");
        await loginBtnEl.click();

        const canvas = await waitForSelectorSafe(page, 'canvas', {visible: true, timeout: 10000})
        await canvas.screenshot({path: process.env.PUPPETEER_USER_QRCODE_IMG_DIR + 'kimi.png'});
        //const base64Data = await canvas.screenshot({encoding: 'base64'});

        //console.log(`\u001b]1337;File=name=screenshot.png;inline=1:${base64Data}\u0007`);

        await waitSafe(60000);
        await page.reload({waitUntil: 'networkidle2'});

        return checkLogin(page, aiAccount.nickname);
    }
}

module.exports = {
    channel: "kimi",
    checkLogin,
    doLogin
};