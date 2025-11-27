/**
 * 异步遍历数组，并发控制
 *
 * @param {Array} arr 待遍历的数组
 * @param {Function} asyncCallback 异步回调函数，每项执行 async (item, index) => {...}
 * @param {number} concurrency 并发数，默认 1（串行执行）
 * @returns {Promise<Array>} 返回每次回调的结果数组
 */
async function asyncForEach(arr, asyncCallback, concurrency = 1) {
    const results = [];
    let index = 0;

    async function worker() {
        while (index < arr.length) {
            const currentIndex = index++;
            results[currentIndex] = await asyncCallback(arr[currentIndex], currentIndex);
        }
    }

    // 启动多个 worker 控制并发
    const workers = Array(Math.min(concurrency, arr.length)).fill().map(() => worker());
    await Promise.all(workers);

    return results;
}

module.exports = {
    asyncForEach,
};