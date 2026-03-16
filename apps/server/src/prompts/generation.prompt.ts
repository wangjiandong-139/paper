/**
 * 章节生成提示词
 *
 * 系统提示词与用户提示词分离，方便独立调整和回归测试。
 * 所有 AI 调用通过 adapters/ai 层，提示词不允许在 Controller 或 Service 中硬编码。
 */
import { OutlineNode, ReferenceItem } from '../../../../packages/shared/src/types';

export interface GenerationPromptParams {
  paperTitle: string;
  subject: string;
  chapterTitle: string;
  chapterLevel: number;
  targetWordCount: number;
  /** 全文总字数，用于上下文 */
  totalWordCount: number;
  /** 子节点标题列表（如有），帮助 AI 把握结构 */
  subsectionTitles?: string[];
  /** 用户确认的文献列表（用于引用注入） */
  references: ReferenceItem[];
}

export function buildGenerationSystemPrompt(): string {
  return [
    'You are an expert academic paper writer.',
    'Your task is to write a complete chapter section for an academic paper.',
    'Requirements:',
    '- Write in fluent academic Chinese (学术中文) unless the paper language is English.',
    '- All citations must come ONLY from the provided reference list.',
    '- Use GB/T 7714 citation format: e.g., [1], [2,3] in-text, and list at the end if needed.',
    '- Do NOT fabricate references not in the provided list.',
    '- Produce well-structured prose with appropriate transitions.',
    '- Match the target word count as closely as possible.',
    '- Output only the chapter content, no titles, no metadata.',
  ].join('\n');
}

export function buildGenerationUserPrompt(params: GenerationPromptParams): string {
  const lines: string[] = [
    `Paper Title: ${params.paperTitle}`,
    `Subject/Discipline: ${params.subject}`,
    ``,
    `Write the following chapter section:`,
    `Chapter: ${params.chapterTitle}`,
    `Target Word Count: ${params.targetWordCount} words`,
    `Overall Paper Length: ${params.totalWordCount} words`,
  ];

  if (params.subsectionTitles && params.subsectionTitles.length > 0) {
    lines.push(``, `This chapter should cover the following subsections:`);
    params.subsectionTitles.forEach((t, i) => {
      lines.push(`  ${i + 1}. ${t}`);
    });
  }

  if (params.references.length > 0) {
    lines.push(``, `Available References (use ONLY these for citations):`);
    params.references.forEach((ref, i) => {
      const authors = ref.authors.join(', ');
      const year = ref.year ? ` (${ref.year})` : '';
      const journal = ref.journal ? `, ${ref.journal}` : '';
      lines.push(`  [${i + 1}] ${authors}${year}. ${ref.title}${journal}.`);
    });
  }

  lines.push(
    ``,
    `Instructions:`,
    `- Write ${params.targetWordCount} words of academic content for "${params.chapterTitle}".`,
    `- Cite relevant references using [n] notation where appropriate.`,
    `- Do not include the chapter title in the output.`,
    `- Output only the chapter body text.`,
  );

  return lines.join('\n');
}

/** 从 OutlineNode 扁平化提取所有需要生成的顶层章节（level=1） */
export function extractTopLevelChapters(outline: OutlineNode[]): OutlineNode[] {
  return outline.filter((node) => node.level === 1);
}

/** 获取一个章节的子节标题列表（直接子节点） */
export function getSubsectionTitles(chapter: OutlineNode): string[] {
  return chapter.children.map((c) => c.title);
}
