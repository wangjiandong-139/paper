import { Injectable } from '@nestjs/common'
import { AdminOperationLogService } from './admin-operation-log.service'

const RETENTION_DAYS = 180

@Injectable()
export class AdminOperationLogRetentionJob {
  constructor(private readonly logService: AdminOperationLogService) {}

  async run(): Promise<{ deletedCount: number }> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS)

    const deletedCount = this.logService.deleteOlderThan(cutoffDate)
    return { deletedCount }
  }
}
