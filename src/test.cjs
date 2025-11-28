const {
    TaskExecutePlanModel,
    AiAccountModel,
    TaskExpandQuestionModel,
} = require('./models/index.cjs');

(async () => {
    try {
        // await TaskExecutePlanModel.transaction(async trx => {
        //     const plan = await TaskExecutePlanModel.selectForUpdate({id: 1}, trx, ['*']);
        //     console.log('Locked Plan:', plan);
        //     if (plan.length === 0) {
        //         console.log('No plan found with id 1');
        //         return;
        //     }
        //     if (plan[0] && plan[0].execute_status === 1) {
        //         const affected = await TaskExecutePlanModel.updateById(plan[0].id,{status: 2}, trx);
        //         console.log('update affected:', affected);
        //     }
        // });

        // const account = await AiAccountModel.findById(1);
        // console.log(account)

        // const now = new Date();           // 本地时间
        // const nowUTC = new Date(Date.now() - (new Date().getTimezoneOffset() * 60000));
        // console.log('Local Time:', now.toISOString());
        // console.log('UTC Time:', nowUTC.toISOString());

        //const list = await AiAskDetailModel.find({ai_id:1, action_status: 0}, ['count(*) as c']);
        // const list = await TaskExecutePlanModel.find({
        //     ai_bot_id: 1,
        //     execute_status:1,
        // }, ['id', 'question_id', 'task_id'], {
        //     orderBy: ['id', 'desc'],
        //     limit: 5
        // })
        // console.log(list);
        const r = await TaskExecutePlanModel.updateById(3, {execute_status: 4});
        console.log(r);


    } catch (err) {
        console.log(err);
    } finally {
        await AiAccountModel.destroy()
    }
})();