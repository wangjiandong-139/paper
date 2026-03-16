import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { GenerationProgressService } from './generation-progress.service';

/**
 * SSE 进度接口：GET /api/orders/:id/progress
 *
 * 建立 Server-Sent Events 连接，实时推送 GenerationProgressEvent。
 * 生产环境通过 Redis Pub/Sub 订阅 channel `order:progress:{id}` 转发事件；
 * 当前实现使用进程内 EventEmitter 转发。
 */
@UseGuards(JwtAuthGuard)
@Controller('api/orders')
export class GenerationController {
  constructor(private readonly progressService: GenerationProgressService) {}

  @Get(':id/progress')
  streamProgress(@Param('id') orderId: string, @Res() res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send latest known progress immediately (catch up)
    const latest = this.progressService.getLatestProgress(orderId);
    if (latest) {
      res.write(`data: ${JSON.stringify(latest)}\n\n`);
    }

    const handler = (event: unknown): void => {
      const e = event as { order_id: string };
      if (e.order_id === orderId) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    };

    this.progressService.on('progress', handler);

    res.on('close', () => {
      this.progressService.off('progress', handler);
    });
  }
}
