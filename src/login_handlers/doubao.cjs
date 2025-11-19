const {waitForSelectorSafe, waitSafe} = require("../util/wait.cjs");
const fs = require('fs');

// 判断豆包是否已登录
async function checkLogin(page) {
    // 该元素依赖webui 如果变动需要重新寻找
    const loginBtnSel = 'button[data-testid="to_login_button"]';

    const loginBtn = await waitForSelectorSafe(page, loginBtnSel, { visible: true, timeout: 5000 });

    if (!loginBtn) {
        console.log("Doubao 已登录");
        return true;
    }

    console.log("Doubao 未登录");
    return false;
}

//进行豆包登录操作
async function doLogin(page) {
    console.log("开始 Doubao 登录...");

    const loginBtnSel = 'button[data-testid="to_login_button"]';
    const qrSwitchSel = 'div[data-testid="qrcode_switcher"]';
    const qrImgSel = 'img[data-testid="qrcode_image"]';

    const loginBtn = await waitForSelectorSafe(page, loginBtnSel, { visible: true, timeout: 15000 });
    // 没有找到登录按钮，无法继续登录
    if (!loginBtn) return false;

    // 点击登录按钮
    await loginBtn.click();

    // 查找二维码切换按钮
    const qrSwitch = await waitForSelectorSafe(page, qrSwitchSel, { visible: true, timeout: 15000 });
    // 如果没有找到二维码切换按钮，无法继续登录
    if (!qrSwitch) return false;

    // 使用 evaluate 方式点击切换按钮
    await page.evaluate(sel => {
        document.querySelector(sel)?.click();
    }, qrSwitchSel);

    // 查找二维码图片
    const qrEl = await waitForSelectorSafe(page, qrImgSel, { visible: true, timeout: 15000 });
    // 如果没有二维码图片无法继续登录
    if (!qrEl) return false;

    // 获取二维码图片的 src 属性
    const qrSrc = await qrEl.evaluate(n => n.src);

    // 豆包的是base64
    const b64 = qrSrc.replace(/^data:image\/\w+;base64,/, "");

    // 暂时先写一个文件。正式的项目中可以直接展示在界面上
    fs.writeFileSync(process.env.PUPPETEER_USER_QRCODE_IMG_DIR + "/qrimg.png", Buffer.from(b64, "base64"));

    // 豆包的二维码有效时间1分钟
    console.log("二维码已保存，等待 60 秒扫码...");
    await waitSafe(page, 60000);

    // 刷新页面，检查是否登录成功
    await page.reload({ waitUntil: 'networkidle2' });

    // 查找登录后用户头像的元素
    const avatarSel = 'span[data-testid="chat_header_avatar_button"]';
    return !!(await waitForSelectorSafe(page, avatarSel, { visible: true, timeout: 15000 }));
}

module.exports = {
    channel: "doubao",
    checkLogin,
    doLogin
};