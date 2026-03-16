import { Injectable } from '@nestjs/common';
import { ChapterStatus, OrderStatus } from '../../../../../packages/shared/src/enums';
import { OutlineNode, ReferenceItem } from '../../../../../packages/shared/src/types';
import { IAiAdapter } from '../../adapters/ai/ai.adapter.interface';
import {
  buildGenerationSystemPrompt,
  buildGenerationUserPrompt,
  extractTopLevelChapters,
  getSubsectionTitles,
} from '../../prompts/generation.prompt';
import { GenerationProgressService } from './generation-progress.service';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GenerationJobData {
  orderId: string;
  outline: OutlineNode[];
  references: ReferenceItem[];
  totalWordCount: number;
  paperTitle: string;
  subject: string;
}

export interface GeneratedChapterDTO {
  orderId: string;
  chapterIndex: number;
  title: string;
  level: number;
  content: string;
  status: ChapterStatus;
}

export interface JobResult {
  orderId: string;
  finalStatus: OrderStatus;
  chapters: GeneratedChapterDTO[];
}

// ── Worker ────────────────────────────────────────────────────────────────────

@Injectable()
export class GenerationWorkerService {
  /** 每章最大重试次数（含首次尝试，共 MAX_RETRIES+1 次调用） */
  static readonly MAX_RETRIES = 3;

  private readonly chapters = new Map<string, GeneratedChapterDTO[]>();

  constructor(
    private readonly aiAdapter: IAiAdapter,
    private readonly progressService: GenerationProgressService,
  ) {}

  async processJob(job: GenerationJobData): Promise<JobResult> {
    const topChapters = extractTopLevelChapters(job.outline);
    const totalChapters = topChapters.length;
    const generatedChapters: GeneratedChapterDTO[] = [];

    for (let i = 0; i < topChapters.length; i++) {
      const chapter = topChapters[i];
      const result = await this.generateChapterWithRetry(job, chapter, i);
      generatedChapters.push(result);

      if (result.status === ChapterStatus.FAILED) {
        // Fast-fail: stop generation on first chapter failure
        this.chapters.set(job.orderId, generatedChapters);
        this.progressService.publishProgress(
          job.orderId,
          totalChapters,
          i + 1,
          chapter.title,
          OrderStatus.FAILED,
        );
        return { orderId: job.orderId, finalStatus: OrderStatus.FAILED, chapters: generatedChapters };
      }

      this.progressService.publishProgress(
        job.orderId,
        totalChapters,
        i + 1,
        chapter.title,
        i + 1 === totalChapters ? OrderStatus.COMPLETED : OrderStatus.GENERATING,
      );
    }

    this.chapters.set(job.orderId, generatedChapters);
    return { orderId: job.orderId, finalStatus: OrderStatus.COMPLETED, chapters: generatedChapters };
  }

  private async generateChapterWithRetry(
    job: GenerationJobData,
    chapter: OutlineNode,
    chapterIndex: number,
  ): Promise<GeneratedChapterDTO> {
    const targetWordCount = chapter.word_count ?? Math.floor(job.totalWordCount / job.outline.filter((n) => n.level === 1).length);
    const userPrompt = buildGenerationUserPrompt({
      paperTitle: job.paperTitle,
      subject: job.subject,
      chapterTitle: chapter.title,
      chapterLevel: chapter.level,
      targetWordCount,
      totalWordCount: job.totalWordCount,
      subsectionTitles: getSubsectionTitles(chapter),
      references: job.references,
    });
    const systemPrompt = buildGenerationSystemPrompt();

    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= GenerationWorkerService.MAX_RETRIES; attempt++) {
      try {
        const content = await this.aiAdapter.completion(userPrompt, systemPrompt);
        return {
          orderId: job.orderId,
          chapterIndex,
          title: chapter.title,
          level: chapter.level,
          content,
          status: ChapterStatus.DONE,
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    return {
      orderId: job.orderId,
      chapterIndex,
      title: chapter.title,
      level: chapter.level,
      content: '',
      status: ChapterStatus.FAILED,
    };
  }

  getChapters(orderId: string): GeneratedChapterDTO[] {
    return this.chapters.get(orderId) ?? [];
  }
}
