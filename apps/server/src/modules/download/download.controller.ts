import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { DownloadResult, DownloadService } from './download.service';

interface AuthedRequest extends Request {
  user?: { id: string };
}

@UseGuards(JwtAuthGuard)
@Controller('api/orders')
export class DownloadController {
  constructor(private readonly downloadService: DownloadService) {}

  @Post(':id/download')
  async download(
    @Req() req: AuthedRequest,
    @Param('id') orderId: string,
    @Body() body: { format?: 'docx' | 'pdf' },
  ): Promise<DownloadResult> {
    const userId = req.user?.id ?? 'mock-user-id';
    const format = body.format ?? 'docx';
    return this.downloadService.generateDownload(userId, orderId, format);
  }
}
