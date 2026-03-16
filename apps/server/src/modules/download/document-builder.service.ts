import { Injectable } from '@nestjs/common';
import {
  AlignmentType,
  convertInchesToTwip,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import { FormatTemplateConfig } from '../template/template.service';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DocumentBuildParams {
  title: string;
  content: string;
  config: FormatTemplateConfig;
}

// ── Conversion helpers ────────────────────────────────────────────────────────

/** 毫米 → twip（1 inch = 1440 twip，1 inch ≈ 25.4mm） */
const mmToTwip = (mm: number): number => convertInchesToTwip(mm / 25.4);

/** pt → half-points（docx 内部字号单位） */
const ptToHalfPt = (pt: number): number => pt * 2;

@Injectable()
export class DocumentBuilderService {
  /**
   * 将论文内容渲染为 .docx 文件 Buffer。
   *
   * - 将 HTML 段落拆分为 Paragraph 列表
   * - 应用 FormatTemplate 中的页边距、字体、行距参数
   * - 引文格式记录在文档属性中（GB/T 7714 / APA / MLA），供后续渲染引用列表使用
   */
  async build(params: DocumentBuildParams): Promise<Buffer> {
    const { title, content, config } = params;

    const { margins, font, lineSpacing } = config;

    // Convert line spacing (e.g. 1.5 → 240*1.5 = 360 twip, in 240ths of a line)
    const lineSpacingValue = Math.round(240 * lineSpacing);

    const paragraphs = this.parseContentToParagraphs(content, font, lineSpacingValue);

    const doc = new Document({
      title,
      description: `Citation format: ${config.citationFormat}`,
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: mmToTwip(margins.top),
                bottom: mmToTwip(margins.bottom),
                left: mmToTwip(margins.left),
                right: mmToTwip(margins.right),
              },
            },
          },
          children: [
            // Document title
            new Paragraph({
              text: title,
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
              spacing: { line: lineSpacingValue },
              run: {
                font: font.heading,
                size: ptToHalfPt(font.sizeH1),
              },
            }),
            ...paragraphs,
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    return Buffer.from(buffer);
  }

  private parseContentToParagraphs(
    content: string,
    font: FormatTemplateConfig['font'],
    lineSpacingValue: number,
  ): Paragraph[] {
    if (!content) return [];

    // Strip HTML tags and split into lines
    const plainText = content
      .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n$1\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ');

    const lines = plainText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    return lines.map(
      (line) =>
        new Paragraph({
          children: [
            new TextRun({
              text: line,
              font: font.body,
              size: ptToHalfPt(font.sizeBody),
            }),
          ],
          spacing: { line: lineSpacingValue },
        }),
    );
  }
}
