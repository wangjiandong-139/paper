import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RevisionType } from '../../../../../packages/shared/src/enums';
import {
  CitationCheckResultDTO,
  CitationItem,
  ReferenceItem,
} from '../../../../../packages/shared/src/types';
import { IAiAdapter } from '../../adapters/ai/ai.adapter.interface';
import { OrderService } from '../order/order.service';

// ── Constants ─────────────────────────────────────────────────────────────────

/** BASIC 套餐每单最多 AI 改稿次数 */
const BASIC_REVISION_LIMIT = 3;

/** 计入改稿次数的操作类型（全部六种 RevisionType 均计入） */
const COUNTED_REVISION_TYPES: ReadonlySet<RevisionType> = new Set([
  RevisionType.REWRITE,
  RevisionType.REDUCE_PLAGIARISM,
  RevisionType.REDUCE_AI,
  RevisionType.EXPAND,
  RevisionType.SHRINK,
  RevisionType.POLISH,
]);

// ── Types ─────────────────────────────────────────────────────────────name────

export interface SaveRevisionDTO {
  chapterIndex?: number;
  content: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class RevisionService {
  /** orderId → { userId, content } */
  private readonly contentStore = new Map<string, { userId: string; content: string }>();

  constructor(
    private readonly orderService: OrderService,
    private readonly aiAdapter: IAiAdapter,
  ) {}

  /** 保存用户手动编辑的论文内容（HTML / JSON 格式） */
  async saveContent(userId: string, orderId: string, content: string): Promise<void> {
    const order = await this.orderService.getOrder(userId, orderId);
    if (!order) throw new NotFoundException(`Order ${orderId} not found or access denied`);
    this.contentStore.set(orderId, { userId, content });
  }

  /** 读取已保存的改稿内容；无权限时返回 null */
  async getContent(userId: string, orderId: string): Promise<string | null> {
    const entry = this.contentStore.get(orderId);
    if (!entry || entry.userId !== userId) return null;
    return entry.content;
  }

  /**
   * 发起 AI 改稿请求，返回流式响应（AsyncIterable<string>）
   *
   * 所有 RevisionType 均计入改稿次数；BASIC 套餐上限 3 次，超限抛出 ForbiddenException。
   */
  async requestAiRevision(
    userId: string,
    orderId: string,
    type: RevisionType,
    instruction: string | undefined,
    references: ReferenceItem[],
  ): Promise<AsyncIterable<string>> {
    const order = await this.orderService.getOrder(userId, orderId);
    if (!order) throw new NotFoundException(`Order ${orderId} not found or access denied`);

    if (COUNTED_REVISION_TYPES.has(type)) {
      const count = await this.orderService.getAiRevisionCount(orderId);
      if (count >= BASIC_REVISION_LIMIT) {
        throw new ForbiddenException(
          `AI 改稿次数已达上限（${BASIC_REVISION_LIMIT}次），当前套餐不支持更多改稿`,
        );
      }
      await this.orderService.incrementAiRevisionCount(orderId);
    }

    const content = this.contentStore.get(orderId)?.content ?? '';
    const userPrompt = this.buildRevisionPrompt(type, content, instruction, references);
    const systemPrompt = this.buildRevisionSystemPrompt(type);

    return this.aiAdapter.streamCompletion(userPrompt, systemPrompt);
  }

  /**
   * 引用核对：扫描正文中的 [n] 引用标记，与文献列表对比。
   * 返回 `traceable`（在列表中）和 `untraceable`（超出范围）两组。
   */
  async checkCitations(
    userId: string,
    orderId: string,
    references: ReferenceItem[],
  ): Promise<CitationCheckResultDTO> {
    const entry = this.contentStore.get(orderId);
    if (!entry || entry.userId !== userId) {
      return { traceable: [], untraceable: [] };
    }

    const content = entry.content;
    const CITATION_PATTERN = /\[(\d+(?:,\s*\d+)*)\]/g;
    const traceable: CitationItem[] = [];
    const untraceable: CitationItem[] = [];

    let match: RegExpExecArray | null;
    while ((match = CITATION_PATTERN.exec(content)) !== null) {
      const fullCitation = match[0];
      const indices = match[1].split(',').map((s) => parseInt(s.trim(), 10));

      const allTraceable = indices.every((idx) => idx >= 1 && idx <= references.length);
      const item: CitationItem = {
        text: this.extractSurroundingContext(content, match.index, fullCitation),
        reference_id: allTraceable ? references[indices[0] - 1]?.id : undefined,
        traceable: allTraceable,
      };

      if (allTraceable) {
        traceable.push(item);
      } else {
        untraceable.push(item);
      }
    }

    return { traceable, untraceable };
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private extractSurroundingContext(content: string, matchIndex: number, citation: string): string {
    const start = Math.max(0, matchIndex - 20);
    const end = Math.min(content.length, matchIndex + citation.length + 20);
    return content.slice(start, end);
  }

  private buildRevisionSystemPrompt(type: RevisionType): string {
    const typeDescriptions: Record<RevisionType, string> = {
      [RevisionType.REWRITE]: 'Rewrite the provided text according to the given instructions, maintaining academic style.',
      [RevisionType.REDUCE_PLAGIARISM]: 'Rewrite the text to reduce similarity with existing publications while preserving meaning.',
      [RevisionType.REDUCE_AI]: 'Rephrase the text to reduce AI-generated patterns, making it sound more naturally human-written.',
      [RevisionType.EXPAND]: 'Expand the text with more details, examples, and analysis while maintaining academic quality.',
      [RevisionType.SHRINK]: 'Condense the text while preserving the key points and academic integrity.',
      [RevisionType.POLISH]: 'Polish the text for better academic language, flow, and clarity.',
    };
    return [
      'You are an expert academic paper editor.',
      typeDescriptions[type],
      'Output only the revised text, no explanations.',
    ].join('\n');
  }

  private buildRevisionPrompt(
    type: RevisionType,
    content: string,
    instruction: string | undefined,
    references: ReferenceItem[],
  ): string {
    const lines = [
      `Original text to revise:`,
      `---`,
      content,
      `---`,
    ];

    if (instruction) {
      lines.push(``, `Specific instructions: ${instruction}`);
    }

    if (references.length > 0 && (type === RevisionType.REWRITE || type === RevisionType.REDUCE_PLAGIARISM)) {
      lines.push(``, `Available references (citations must come only from this list):`);
      references.forEach((ref, i) => {
        lines.push(`  [${i + 1}] ${ref.authors.join(', ')}. ${ref.title}.`);
      });
    }

    return lines.join('\n');
  }
}
