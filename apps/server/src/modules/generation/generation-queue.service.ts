import { Injectable } from '@nestjs/common';
import { GenerationJobData } from './generation-worker.service';

/**
 * GenerationQueueService — 内存队列（BullMQ 存根）
 *
 * 生产环境将替换为 BullMQ + Redis：
 *   const queue = new Queue('paper-generation', { connection: redisClient });
 *   await queue.add('generate', jobData);
 *
 * 当前实现提供与 BullMQ 队列等价的 FIFO 语义，支持幂等入队（同一 orderId 不重复）。
 */
@Injectable()
export class GenerationQueueService {
  private readonly queue: GenerationJobData[] = [];
  private readonly enqueued = new Set<string>();

  /** 将生成任务加入队列；同一 orderId 幂等（重复入队忽略） */
  enqueue(job: GenerationJobData): boolean {
    if (this.enqueued.has(job.orderId)) return false;
    this.queue.push(job);
    this.enqueued.add(job.orderId);
    return true;
  }

  /** 取出队首任务（FIFO），队列为空时返回 undefined */
  dequeue(): GenerationJobData | undefined {
    const job = this.queue.shift();
    return job;
  }

  get size(): number {
    return this.queue.length;
  }
}
