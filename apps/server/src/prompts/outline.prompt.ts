/**
 * 提纲生成提示词
 *
 * 系统提示词与用户提示词分离，方便独立调整和回归测试。
 * 所有 AI 调用通过 adapters/ai 层，提示词不允许在 Controller 或 Service 中硬编码。
 */

export interface OutlinePromptParams {
  subject: string;
  title: string;
  word_count: number;
  degree_type: string;
  /** 已确认文献标题列表（用于上下文增强） */
  reference_titles?: string[];
}

export function buildOutlineSystemPrompt(): string {
  return [
    'You are an expert academic paper outline generator.',
    'Your task is to generate a well-structured outline for an academic paper.',
    'Output ONLY a valid JSON array of OutlineNode objects. Do not include any explanation or markdown.',
    '',
    'OutlineNode schema:',
    '{',
    '  "id": string,       // unique identifier, e.g. "1", "1.1", "1.1.1"',
    '  "title": string,    // section title',
    '  "level": number,    // 1=chapter, 2=section, 3=subsection (max depth 3)',
    '  "word_count": number, // suggested word count for this section',
    '  "children": OutlineNode[], // nested sections',
    '  "placeholders": ("figure"|"table"|"formula"|"code")[] // optional',
    '}',
  ].join('\n');
}

export function buildOutlineUserPrompt(params: OutlinePromptParams): string {
  const degreeLabel: Record<string, string> = {
    undergraduate: 'Undergraduate Thesis',
    master: "Master's Thesis",
    doctor: 'Doctoral Dissertation',
    other: 'Academic Paper',
  };

  const lines = [
    `Generate a complete outline for the following academic paper:`,
    ``,
    `Title: ${params.title}`,
    `Subject/Discipline: ${params.subject}`,
    `Degree Type: ${degreeLabel[params.degree_type] ?? params.degree_type}`,
    `Total Word Count: ${params.word_count.toLocaleString()}`,
  ];

  if (params.reference_titles && params.reference_titles.length > 0) {
    lines.push(``, `Key References (use to inform the outline):`);
    params.reference_titles.slice(0, 10).forEach((t, i) => {
      lines.push(`  ${i + 1}. ${t}`);
    });
  }

  lines.push(
    ``,
    `Requirements:`,
    `- Produce 3-6 top-level chapters (level 1)`,
    `- Each chapter may have 2-5 sections (level 2)`,
    `- Sections may optionally have subsections (level 3)`,
    `- Allocate word_count proportionally to total ${params.word_count} words`,
    `- Return ONLY the JSON array, no extra text`,
  );

  return lines.join('\n');
}
