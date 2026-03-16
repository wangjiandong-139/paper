import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common'
import {
  AdminOrderStatus,
  GenerationJobStatus,
  GenerationJobTriggerSource,
  GenerationJobEventType,
} from '@ai-paper/shared'
import { AdminGenerationJobsService } from './admin-generation-jobs.service'
import { AdminOrdersService } from '../admin-orders/admin-orders.service'
import { AdminOperationLogService } from '../admin-logs/admin-operation-log.service'

@Injectable()
export class AdminGenerationJobCommandService {
  constructor(
    private readonly jobsService: AdminGenerationJobsService,
    private readonly ordersService: AdminOrdersService,
    private readonly logService: AdminOperationLogService,
  ) {}

  async retryOrder(orderId: string, operatorAdminUserId: string): Promise<{ jobId: string }> {
    const order = await this.ordersService.getOrderDetail(orderId)

    if (order.status !== AdminOrderStatus.FAILED) {
      throw new BadRequestException(`Order must be in FAILED status to retry, current: ${order.status}`)
    }

    const runningJob = this.jobsService.getRunningJobForOrder(orderId)
    if (runningJob) {
      throw new ConflictException(`A job is already running for order ${orderId}`)
    }

    const newJob = this.jobsService.createJob({
      orderId,
      triggerSource: GenerationJobTriggerSource.MANUAL_RETRY,
      operatorAdminUserId,
    })

    this.jobsService.addEventLog(newJob.id, {
      eventType: GenerationJobEventType.QUEUED,
      message: `Manual retry triggered by admin ${operatorAdminUserId}`,
    })

    this.ordersService._updateOrderStatus(orderId, AdminOrderStatus.GENERATING)

    await this.logService.log({
      actorAdminUserId: operatorAdminUserId,
      actorUsername: operatorAdminUserId,
      actionType: 'ORDER_RETRY',
      targetType: 'Order',
      targetId: orderId,
      summary: `Retried order generation for order ${orderId}`,
      beforeJson: { status: AdminOrderStatus.FAILED },
      afterJson: { status: AdminOrderStatus.GENERATING, jobId: newJob.id },
    })

    return { jobId: newJob.id }
  }

  async cancelJob(jobId: string, operatorAdminUserId: string): Promise<{ success: boolean }> {
    const job = this.jobsService.findById(jobId)
    if (!job) throw new NotFoundException(`GenerationJob ${jobId} not found`)

    if (
      job.status !== GenerationJobStatus.QUEUED &&
      job.status !== GenerationJobStatus.RUNNING
    ) {
      throw new BadRequestException(`Cannot cancel job in status: ${job.status}`)
    }

    this.jobsService.updateJobStatus(jobId, GenerationJobStatus.FAILED, {
      terminalReason: 'MANUAL_CANCELLED',
      failureMessage: `Manually cancelled by admin ${operatorAdminUserId}`,
      finishedAt: new Date(),
    })

    this.ordersService._updateOrderStatus(job.orderId, AdminOrderStatus.FAILED)

    await this.logService.log({
      actorAdminUserId: operatorAdminUserId,
      actorUsername: operatorAdminUserId,
      actionType: 'JOB_CANCEL',
      targetType: 'GenerationJob',
      targetId: jobId,
      summary: `Cancelled generation job ${jobId}`,
      beforeJson: { status: job.status },
      afterJson: { status: GenerationJobStatus.FAILED, terminalReason: 'MANUAL_CANCELLED' },
    })

    return { success: true }
  }

  async retryJob(jobId: string, operatorAdminUserId: string): Promise<{ jobId: string }> {
    const job = this.jobsService.findById(jobId)
    if (!job) throw new NotFoundException(`GenerationJob ${jobId} not found`)

    if (job.status !== GenerationJobStatus.FAILED) {
      throw new BadRequestException(`Can only retry FAILED jobs, current: ${job.status}`)
    }

    const runningJob = this.jobsService.getRunningJobForOrder(job.orderId)
    if (runningJob) {
      throw new ConflictException(`A job is already running for order ${job.orderId}`)
    }

    const newJob = this.jobsService.createJob({
      orderId: job.orderId,
      triggerSource: GenerationJobTriggerSource.MANUAL_RETRY,
      operatorAdminUserId,
    })

    this.ordersService._updateOrderStatus(job.orderId, AdminOrderStatus.GENERATING)

    await this.logService.log({
      actorAdminUserId: operatorAdminUserId,
      actorUsername: operatorAdminUserId,
      actionType: 'JOB_RETRY',
      targetType: 'GenerationJob',
      targetId: jobId,
      summary: `Retried generation job ${jobId}, new job: ${newJob.id}`,
      afterJson: { newJobId: newJob.id },
    })

    return { jobId: newJob.id }
  }
}
