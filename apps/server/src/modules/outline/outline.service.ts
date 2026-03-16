import { Inject, Injectable, Optional } from '@nestjs/common';
import { IAiAdapter } from '../../adapters/ai/ai.adapter.interface';
import { OpenAiAdapter } from '../../adapters/ai/openai.adapter';
import {
  buildOutlineSystemPrompt,
  buildOutlineUserPrompt,
} from '../../prompts/outline.prompt';

export interface OutlineNode {
  id: string;
  title: string;
  level: number;
  word_count?: number;
  children: OutlineNode[];
  placeholders?: Array<'figure' | 'table' | 'formula' | 'code'>;
}

export interface OutlineGenerateParams {
  subject: string;
  title: string;
  word_count: number;
  degree_type: string;
  reference_titles?: string[];
}

export interface SseChunk {
  type: 'progress' | 'complete' | 'error';
  data: string;
}

/** 递归验证 OutlineNode 树：level 范围 1-3，子节点 level 必须等于父节点 level+1 */
export function validateOutlineNodes(
  nodes: OutlineNode[],
  expectedLevel = 1,
): boolean {
  for (const node of nodes) {
    if (node.level !== expectedLevel) return false;
    if (node.level < 1 || node.level > 3) return false;
    if (node.children && node.children.length > 0) {
      if (!validateOutlineNodes(node.children, expectedLevel + 1)) return false;
    }
  }
  return true;
}

/** 解析 AI 返回的 JSON 字符串，提取 OutlineNode[] */
export function parseOutlineJson(raw: string): OutlineNode[] {
  const trimmed = raw.trim();

  // 从可能包含 markdown 代码块的响应中提取 JSON
  const jsonMatch =
    trimmed.match(/```(?:json)?\n?([\s\S]*?)\n?```/) ??
    trimmed.match(/(\[[\s\S]*\])/);

  const jsonStr = jsonMatch ? jsonMatch[1] : trimmed;

  const parsed: unknown = JSON.parse(jsonStr);

  if (!Array.isArray(parsed)) {
    throw new Error('AI response is not a JSON array');
  }

  return parsed as OutlineNode[];
}

@Injectable()
export class OutlineService {
  private readonly aiAdapter: IAiAdapter;

  constructor(
    @Optional() @Inject('IAiAdapter') injectedAdapter: IAiAdapter | null,
    private readonly openAiAdapter: OpenAiAdapter,
  ) {
    this.aiAdapter = injectedAdapter ?? openAiAdapter;
  }

  /**
   * 非流式生成：收集全部 AI 输出后解析并返回 OutlineNode[]。
   * 用于单元测试和内部调用。
   */
  async generate(params: OutlineGenerateParams): Promise<OutlineNode[]> {
    const systemPrompt = buildOutlineSystemPrompt();
    const userPrompt = buildOutlineUserPrompt(params);

    const raw = await this.aiAdapter.completion(userPrompt, systemPrompt);

    let nodes: OutlineNode[];
    try {
      nodes = parseOutlineJson(raw);
    } catch {
      throw new Error(`Failed to parse AI outline response: ${raw}`);
    }

    return nodes;
  }

  /**
   * 流式生成：逐 chunk 转发 AI 输出，最后推送 complete 事件（含解析好的 outline）。
   * Controller 负责将每个 SseChunk 写入 SSE 响应。
   */
  async *generateStream(
    params: OutlineGenerateParams,
  ): AsyncGenerator<SseChunk> {
    const systemPrompt = buildOutlineSystemPrompt();
    const userPrompt = buildOutlineUserPrompt(params);

    let accumulated = '';

    for await (const chunk of this.aiAdapter.streamCompletion(
      userPrompt,
      systemPrompt,
    )) {
      accumulated += chunk;
      yield { type: 'progress', data: chunk };
    }

    let nodes: OutlineNode[];
    try {
      nodes = parseOutlineJson(accumulated);
    } catch {
      yield {
        type: 'error',
        data: `Failed to parse outline JSON: ${accumulated.slice(0, 200)}`,
      };
      return;
    }

    yield { type: 'complete', data: JSON.stringify(nodes) };
  }
}
