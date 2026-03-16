import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common'
import { Request } from 'express'
import { AdminGenerationJobsService } from './admin-generation-jobs.service'
import { AdminGenerationJobCommandService } from './admin-generation-job-command.service'
import { AdminSessionGuard } from '../../common/guards/admin-session.guard'
import { GenerationJobStatus, RetryGenerationJobDto } from '@ai-paper/shared'
import type { AdminSession } from '../admin-auth/admin-session.service'

@UseGuards(AdminSessionGuard)
@Controller('api/admin/generation-jobs')
export class AdminGenerationJobsController {
  constructor(
    private readonly jobsService: AdminGenerationJobsService,
    private readonly commandService: AdminGenerationJobCommandService,
  ) {}

  @Get()
  async listJobs(@Query() query: { status?: GenerationJobStatus; orderId?: string; page?: string; pageSize?: string }) {
    return this.jobsService.listJobs({
      status: query.status,
      orderId: query.orderId,
      page: query.page ? parseInt(query.page) : undefined,
      pageSize: query.pageSize ? parseInt(query.pageSize) : undefined,
    })
  }

  @Get(':jobId')
  async getJobDetail(@Param('jobId') jobId: string) {
    return this.jobsService.getJobDetail(jobId)
  }

  @Post(':jobId/cancel')
  async cancelJob(
    @Param('jobId') jobId: string,
    @Req() req: Request,
  ) {
    const session = req['adminSession'] as AdminSession
    return this.commandService.cancelJob(jobId, session.adminUserId)
  }

  @Post(':jobId/retry')
  async retryJob(
    @Param('jobId') jobId: string,
    @Body() dto: RetryGenerationJobDto,
    @Req() req: Request,
  ) {
    const session = req['adminSession'] as AdminSession
    return this.commandService.retryJob(jobId, session.adminUserId)
  }
}
