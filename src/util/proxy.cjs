const axios = require('axios');

const url = "http://api.shenlongip.com/ip?key=x3jmidc1&protocol=2&mr=1&pattern=json&need=1100&count=1&sign=8a58693557c8df91f4669c22f6e7c561"

async function fetchProxy() {
    try {
        const response = await axios.get(url);
        // {"code":200,"data":[{"ip":"220.190.40.25","port":40035,"expire":"2025-12-02 18:17:24"}]}
        // 获取ip和port
        if (response.data && response.data.code === 200 && response.data.data && response.data.data.length > 0) {
            const proxyInfo = response.data.data[0];
            return `http://${proxyInfo.ip}:${proxyInfo.port}`;
        } else {
            return null;
        }
    } catch (error) {
        console.error("获取代理失败:", error);
        return ""
    }
}

module.exports = {
    fetchProxy
};