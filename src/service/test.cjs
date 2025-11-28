const ScrapeService = require("./ScrapeService.cjs");

(async () => {
    console.log("test service");

    const service = new ScrapeService();

    const result = await service.getTaskPlanList(1, 10);

    const question = await service.getTaskPlanQuestionById(3);

    console.log(result, question)

})();