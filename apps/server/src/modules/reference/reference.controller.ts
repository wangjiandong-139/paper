import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { ParseResult, ReferenceService, SuggestResult } from './reference.service';

interface SuggestQueryParams {
  subject?: string;
  title?: string;
  language?: string;
  page?: string;
}

interface ParseBody {
  raw_text: string;
}

@Controller('api/references')
@UseGuards(JwtAuthGuard)
export class ReferenceController {
  constructor(private readonly referenceService: ReferenceService) {}

  @Get('suggest')
  async suggest(@Query() query: SuggestQueryParams): Promise<SuggestResult> {
    return this.referenceService.suggest({
      subject: query.subject ?? '',
      title: query.title ?? '',
      language: query.language === 'en' ? 'en' : 'zh',
      page: query.page ? parseInt(query.page, 10) : 1,
    });
  }

  @Post('parse')
  parse(@Body() body: ParseBody): ParseResult {
    return this.referenceService.parseCitations(body.raw_text ?? '');
  }
}
