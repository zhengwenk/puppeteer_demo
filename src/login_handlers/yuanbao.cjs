const {waitSafe, waitForSelectorSafe} = require("../util/wait.cjs");


async function checkLogin(page, nickname = "") {
    const nicknameTextSelector = 'p.nick-info-name';
    const nicknameTextEl = await waitForSelectorSafe(page, nicknameTextSelector, {visible: true, timeout: 15000});

    if (!nicknameTextEl) {
        console.log("登录失败，未找到nickname文本");
        return false;
    }

    const nicknameText = await nicknameTextEl.evaluate(n => n.innerText);

    console.log("nickname:", nicknameText);

    if (nicknameText && nicknameText.trim() === nickname) {
        console.log("登录信息匹配成功");
        return true;
    }

    return false;
}

async function doLogin(page, aiAccount) {
    console.log("开始 yuanbao 登录...");

    // 登录按钮选择
    const loginBtnSelector = 'button.agent-dialogue__tool__login';
    const loginBtnEl = await waitForSelectorSafe(page, loginBtnSelector, {visible: true, timeout: 10000});

    if (!loginBtnEl) {
        console.log("为查找到登录按钮，可能已经登录，进行登录状态检查...");
        return checkLogin(page, aiAccount.nickname);
    } else {
        console.log("找到登录按钮，进行点击登录...");
        await loginBtnEl.click();

        // 查找登录框的iframe
        const wxIframe = await waitForSelectorSafe(page, 'div.hyc-wechat-login iframe', {visible: true, timeout: 5000});
        // 等待iframe 加载完
        await waitSafe(page, 5000);

        if (!wxIframe) {
            console.log("wxIframe not found")
            return;
        }
        const frame = await wxIframe.contentFrame();

        // 查找登录二维码
        const qrcodeImgEl = await waitForSelectorSafe(
            frame,
            '#tpl_old_iframe .js_qrcode_img',
            {visible: true, timeout: 10000}
        );

        if (!qrcodeImgEl) {
            console.log("qrcodeImgEl not found")
            return;
        }

        const qrcodeImgSrc = await qrcodeImgEl.evaluate(node => node.src);
        console.log("qrcode:" + qrcodeImgSrc);

        if (!qrcodeImgSrc || qrcodeImgSrc === "") {
            console.log("qrcodeImgSrc not found")
            return;
        }

        await waitSafe(page, 60000);
        await page.reload({waitUntil: 'networkidle2'});

        return checkLogin(page, aiAccount.nickname);
    }
}

module.exports = {
    channel: "yuanbao",
    checkLogin,
    doLogin
};