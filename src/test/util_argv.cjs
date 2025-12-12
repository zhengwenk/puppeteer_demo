function getQuestionText() {
    const args = process.argv.slice(2);
    if (args.length > 0) {
        return args[0];
    }
}

module.exports = {
    getQuestionText,
}