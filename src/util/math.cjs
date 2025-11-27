function randomInt(min, max) {
    // 包含 min 和 max
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
    randomInt,
};