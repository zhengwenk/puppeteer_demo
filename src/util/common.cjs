function extractClass(exportsObj) {
    // 1. 直接导出 class
    if (typeof exportsObj === 'function') {
        return exportsObj;
    }

    // 2. default 导出
    if (exportsObj && typeof exportsObj.default === 'function') {
        return exportsObj.default;
    }

    // 3. 在对象里面找 class
    if (exportsObj && typeof exportsObj === 'object') {
        for (const key of Object.keys(exportsObj)) {
            if (typeof exportsObj[key] === 'function') {
                return exportsObj[key];
            }
        }
    }

    return null;
}

module.exports = {
    extractClass
}