import {
  Body,
  Controller,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { RevisionType } from '../../../../../packages/shared/src/enums';
import { CitationCheckResultDTO, ReferenceItem } from '../../../../../packages/shared/src/types';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { RevisionService } from './revision.service';

interface AuthedRequest extends Request {
  user?: { id: string };
}

@UseGuards(JwtAuthGuard)
@Controller('api/orders')
export class RevisionController {
  constructor(private readonly revisionService: RevisionService) {}

  @Patch(':id/revision')
  async saveRevision(
    @Req() req: AuthedRequest,
    @Param('id') orderId: string,
    @Body() body: { content: string },
  ): Promise<{ ok: boolean }> {
    const userId = req.user?.id ?? 'mock-user-id';
    await this.revisionService.saveContent(userId, orderId, body.content);
    return { ok: true };
  }

  @Post(':id/revision/ai')
  async aiRevision(
    @Req() req: AuthedRequest,
    @Param('id') orderId: string,
    @Body() body: { type: RevisionType; instruction?: string; references?: ReferenceItem[] },
    @Res() res: Response,
  ): Promise<void> {
    const userId = req.user?.id ?? 'mock-user-id';

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      const stream = await this.revisionService.requestAiRevision(
        userId,
        orderId,
        body.type,
        body.instruction,
        body.references ?? [],
      );

      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal error';
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    } finally {
      res.end();
    }
  }

  @Post(':id/citation-check')
  @HttpCode(200)
  async citationCheck(
    @Req() req: AuthedRequest,
    @Param('id') orderId: string,
    @Body() body: { references: ReferenceItem[] },
  ): Promise<CitationCheckResultDTO> {
    const userId = req.user?.id ?? 'mock-user-id';
    return this.revisionService.checkCitations(userId, orderId, body.references ?? []);
  }
}
