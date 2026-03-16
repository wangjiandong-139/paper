import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import { OrderStatus } from '../../../../../packages/shared/src/enums';
import { GenerationProgressEvent } from '../../../../../packages/shared/src/types';

@Injectable()
export class GenerationProgressService extends EventEmitter {
  private readonly latestProgress = new Map<string, GenerationProgressEvent>();

  override emit(event: string, ...args: unknown[]): boolean {
    if (event === 'progress') {
      const data = args[0] as GenerationProgressEvent;
      this.latestProgress.set(data.order_id, data);
    }
    return super.emit(event, ...args);
  }

  override on(event: string, listener: (...args: unknown[]) => void): this {
    return super.on(event, listener);
  }

  getLatestProgress(orderId: string): GenerationProgressEvent | null {
    return this.latestProgress.get(orderId) ?? null;
  }

  /** 发出生成进度更新事件 */
  publishProgress(
    orderId: string,
    totalChapters: number,
    completedChapters: number,
    currentChapter?: string,
    status: OrderStatus = OrderStatus.GENERATING,
  ): void {
    const event: GenerationProgressEvent = {
      order_id: orderId,
      status,
      total_chapters: totalChapters,
      completed_chapters: completedChapters,
      current_chapter: currentChapter,
    };
    this.emit('progress', event);
  }
}
