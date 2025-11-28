const {
    AiAccountModel,
    TaskExecutePlanModel,
    TaskExpandQuestionModel,
    TaskExecutePlanResultModel
} = require('../models/index.cjs');
const BaseService = require('./BaseService.cjs');

class ScrapeService extends BaseService {

    static executeStatusWaiting = 1; // 等待执行
    static executeStatusInProgress = 2; // 执行中
    static executeStatusCompleted = 3; // 已完成
    static executeStatusFailed = 4; // 执行失败
    static question_status_normal = 1; // 问题状态：正常
    static question_status_deleted = 2; // 问题状态：已删除

    constructor() {
        super(TaskExecutePlanModel.db);
    }

    // 获取任务计划列表
    // @param {number} aiBotId : AI 机器人 ID
    // @param {number} [limit=100] : 获取数量限制

    // @returns {Promise<Array<{id: number, question_id: number, task_id: number}>>}
    async getTaskPlanList(aiBotId, limit = 100) {
        return await TaskExecutePlanModel.find({
            ai_bot_id: aiBotId,
            execute_status: ScrapeService.executeStatusWaiting,
        }, ['id', 'question_id', 'task_id'], {
            orderBy: ['id', 'asc'],
            limit: limit
        });
    }

    // 开始任务计划
    async startTaskPlan(taskPlanInfo) {

        const resultId = await TaskExecutePlanResultModel.create({
            question_id: taskPlanInfo.question_id,
            task_id: taskPlanInfo.task_id,
            plan_id: taskPlanInfo.id,
            execute_status: ScrapeService.executeStatusInProgress,
            start_time: Date.now(),
        })

        if (resultId > 0) {
            await TaskExecutePlanModel.updateById(taskPlanInfo.id, {
                execute_status: ScrapeService.executeStatusInProgress,
            });
        }

        return resultId;
    }

    // 完成任务计划
    async completeTaskPlan(taskPlanInfo, resultId, msg = "", result = {}) {

        await TaskExecutePlanResultModel.updateById(resultId, {
            execute_status: ScrapeService.executeStatusCompleted,
            end_time: Date.now(),
            result_content: result.answer || "",
            reference_links: result.search || "",
            execute_msg: msg,
        });

        await TaskExecutePlanModel.updateById(taskPlanInfo.id, {
            execute_status: ScrapeService.executeStatusCompleted,
        });
    }

    // 失败任务计划
    async failTaskPlan(taskPlan, resultId, msg) {

        await TaskExecutePlanResultModel.updateById(resultId, {
            execute_status: ScrapeService.executeStatusFailed,
            end_time: Date.now(),
            execute_error_msg: msg,
        });

        await TaskExecutePlanModel.updateById(taskPlan.id, {
            execute_status: ScrapeService.executeStatusFailed,
        });

        return true
    }

    /**
     * 获取任务计划对应的问题详情
     * @param {number} questionId - 问题 ID
     * @returns {Promise<{id: number, question_content: string, is_deleted: number}|null>}
     */
    async getTaskPlanQuestionById(questionId) {
        return TaskExpandQuestionModel.findById(questionId)
    }

    async getAiBotById(aiBotId) {
        return AiAccountModel.findById(aiBotId)
    }
}

module.exports = ScrapeService;