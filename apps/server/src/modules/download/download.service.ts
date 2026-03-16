import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderService } from '../order/order.service';
import { RevisionService } from '../revision/revision.service';
import { TemplateService } from '../template/template.service';
import { DocumentBuildParams, DocumentBuilderService } from './document-builder.service';

export interface DownloadResult {
  download_url: string;
}

@Injectable()
export class DownloadService {
  constructor(
    private readonly orderService: OrderService,
    private readonly revisionService: RevisionService,
    private readonly templateService: TemplateService,
    private readonly documentBuilder: DocumentBuilderService,
  ) {}

  /**
   * 生成论文下载文件，返回下载 URL。
   *
   * 当前为存根实现：将文档内容编码为 base64 data URL，供客户端直接下载。
   * 生产环境应上传至 OSS（阿里云/腾讯云），返回预签名 URL（有效期 10 分钟）。
   */
  async generateDownload(
    userId: string,
    orderId: string,
    format: 'docx' | 'pdf',
  ): Promise<DownloadResult> {
    const order = await this.orderService.getOrder(userId, orderId);
    if (!order) throw new NotFoundException(`Order ${orderId} not found or access denied`);

    const content = (await this.revisionService.getContent(userId, orderId)) ?? '';

    // Resolve template config (use default national standard if no template set)
    const templateList = await this.templateService.list();
    const defaultTemplate = templateList.find((t) => t.isDefault) ?? templateList[0];
    const config = defaultTemplate?.config ?? {
      margins: { top: 25, bottom: 25, left: 30, right: 25 },
      font: { body: '宋体', heading: '黑体', sizeBody: 12, sizeH1: 16, sizeH2: 14, sizeH3: 12 },
      lineSpacing: 1.5,
      citationFormat: 'GB/T 7714' as const,
    };

    const buildParams: DocumentBuildParams = {
      title: `论文_${orderId.slice(0, 8)}`,
      content,
      config,
    };

    const docxBuffer = await this.documentBuilder.build(buildParams);

    if (format === 'pdf') {
      // PDF export stub: in production use LibreOffice headless or Puppeteer
      // For now, return the same docx buffer as a placeholder
      const base64 = docxBuffer.toString('base64');
      return {
        download_url: `data:application/pdf;base64,${base64.slice(0, 20)}...(stub)`,
      };
    }

    // docx: return base64 data URL (stub; production: upload to OSS)
    const base64 = docxBuffer.toString('base64');
    const mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    return {
      download_url: `data:${mimeType};base64,${base64}`,
    };
  }
}
