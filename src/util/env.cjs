function detectOS() {
    const os = require('os');

    const platform = os.platform();
    //console.log(platform); // 可能输出 'win32', 'darwin', 'linux', 'aix', 'freebsd', 'sunos'
    let osStr = '';
    if (platform === 'win32') {
        osStr = 'win';
    } else if (platform === 'darwin') {
        osStr = 'macOS';
    } else if (platform === 'linux') {
        osStr = 'linux';
    }

    return osStr
}

module.exports = {
    detectOS,
};