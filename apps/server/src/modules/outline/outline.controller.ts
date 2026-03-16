import {
  Body,
  Controller,
  HttpCode,
  NotFoundException,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { WizardService } from '../wizard/wizard.service';
import { OutlineNode, OutlineService } from './outline.service';

interface AuthedRequest extends Request {
  user?: { id: string };
}

interface GenerateOutlineBody {
  draft_id: string;
}

@Controller('api/outlines')
@UseGuards(JwtAuthGuard)
export class OutlineController {
  constructor(
    private readonly outlineService: OutlineService,
    private readonly wizardService: WizardService,
  ) {}

  private getUserId(req: AuthedRequest): string {
    return (req.user?.id as string | undefined) ?? 'mock-user-id';
  }

  /**
   * POST /api/outlines/generate
   *
   * 接收 draft_id，读取草稿基础信息与确认文献，
   * 调用 AI 适配器生成提纲并以 SSE 流式推送给客户端。
   *
   * SSE 事件格式：
   *   data: {"type":"progress","data":"<chunk>"}\n\n
   *   data: {"type":"complete","data":"<OutlineNode[] JSON>"}\n\n
   *   data: {"type":"error","data":"<message>"}\n\n
   */
  @Post('generate')
  @HttpCode(200)
  async generate(
    @Req() req: AuthedRequest,
    @Body() body: GenerateOutlineBody,
    @Res() res: Response,
  ): Promise<void> {
    const userId = this.getUserId(req);
    const draft = await this.wizardService.getDraft(userId, body.draft_id);

    if (!draft) {
      throw new NotFoundException(`Draft ${body.draft_id} not found`);
    }

    const step1 = (draft.step1_data ?? {}) as Record<string, unknown>;
    const step2 = (draft.step2_data ?? {}) as Record<string, unknown>;

    const referenceTitles: string[] = Array.isArray(step2['references'])
      ? (step2['references'] as { title?: string }[])
          .map((r) => r.title ?? '')
          .filter((t) => t.length > 0)
      : [];

    const params = {
      subject: (step1['subject'] as string | undefined) ?? '',
      title: (step1['title'] as string | undefined) ?? '',
      word_count:
        typeof step1['word_count'] === 'number' ? step1['word_count'] : 8000,
      degree_type:
        (step1['degree_type'] as string | undefined) ?? 'undergraduate',
      reference_titles: referenceTitles,
    };

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    for await (const chunk of this.outlineService.generateStream(params)) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    res.end();
  }

  /**
   * POST /api/outlines/parse
   *
   * 将提纲 JSON 文本解析为 OutlineNode[] 并直接返回（非流式）。
   * 用于前端粘贴提纲文本的辅助功能。
   */
  @Post('parse')
  parseOutline(@Body() body: { outline: OutlineNode[] }): OutlineNode[] {
    return body.outline ?? [];
  }
}
