const {waitSafe, waitForSelectorSafe} = require("../util/wait.cjs");


async function checkLogin(page, nickname = "") {
    const nicknameTextSelector = 'div._9d8da05';
    const nicknameTextEl = await waitForSelectorSafe(page, nicknameTextSelector, {visible: true, timeout: 15000});

    if (!nicknameTextEl) {
        console.log("登录失败，未找到nickname文本");
        return false;
    }

    const nicknameText = await nicknameTextEl.evaluate(n => n.innerText);

    console.log("获取nickname:`${nicknameText}`");

    if (nicknameText && nicknameText.trim() === nickname) {
        console.log("登录信息匹配成功");
        return true;
    }

    return false;
}

async function doLogin(page, aiAccount) {
    console.log("开始 deepseek 登录...");
    //const unLoginUrl = 'https://chat.deepseek.com/sign_in';
    const currentUrl = page.url();

    if (!currentUrl.includes('/sign_in')) {
        console.log("currentUrl: `${currentUrl}`. 未被定位到sign_in页面");
        return checkLogin(page, aiAccount.nickname);
    } else {
        console.log('登录态未生效：页面被重定向到 /sign_in');
        const wxIframe = await waitForSelectorSafe(page, '#wxLogin iframe', {visible: true, timeout: 5000});
        const frame = await wxIframe.contentFrame();

        if (!frame) {
            console.log('未找到微信登录iframe的内容框架');
            return false;
        }

        const qrcodeImgSelector = '#tpl_iframe .js_qrcode_img';
        const qrcodeImgEl = await waitForSelectorSafe(frame, qrcodeImgSelector, {visible: true, timeout: 5000});

        // 获取登录loign失败
        if (!qrcodeImgEl) {
            console.log("获取微信登录二维码失败");
            return false
        }

        const qrcodeImgSrc = await qrcodeImgEl.evaluate(node => node.src);
        console.log("qrcode:" + qrcodeImgSrc);

        // save qrcode

        // 等待扫码
        // 二维码有效时间1分钟
        console.log("二维码已保存，等待 60 秒扫码...");
        await waitSafe(page, 60000);
        await page.reload({waitUntil: 'networkidle2'});

        return checkLogin(page, aiAccount.nickname);
    }
}

module.exports = {
    channel: "deepseek",
    checkLogin,
    doLogin
};