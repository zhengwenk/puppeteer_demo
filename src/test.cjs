const {TaskExecutePlanModel, AiAccountModel} = require('./models/index.cjs');

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

        const account = await AiAccountModel.findById(1);
        console.log(account)


    } catch (err) {
        console.log(err);
    } finally {
        await AiAccountModel.destroy()
    }
})();