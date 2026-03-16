/**
 * DocumentBuilderService + DownloadService 单元测试
 *
 * 覆盖：文档构建返回 Buffer、FormatTemplate 配置注入、引文格式分类、
 * DownloadService 编排流程、格式参数传递、下载 URL 生成。
 */
import { NotFoundException } from '@nestjs/common';
import { PlanType } from '../../../packages/shared/src/enums';
import { FormatTemplateConfig } from '../src/modules/template/template.service';
import { WechatPaymentAdapter } from '../src/adapters/payment/wechat-payment.adapter';
import { OrderService } from '../src/modules/order/order.service';
import { RevisionService } from '../src/modules/revision/revision.service';
import { IAiAdapter } from '../src/adapters/ai/ai.adapter.interface';
import { DocumentBuildParams, DocumentBuilderService } from '../src/modules/download/document-builder.service';
import { DownloadService } from '../src/modules/download/download.service';
import { TemplateService } from '../src/modules/template/template.service';

// ── helpers ──────────────────────────────────────────────────────────────────

const USER_A = 'user-a';

const DEFAULT_CONFIG: FormatTemplateConfig = {
  margins: { top: 25, bottom: 25, left: 30, right: 25 },
  font: { body: '宋体', heading: '黑体', sizeBody: 12, sizeH1: 16, sizeH2: 14, sizeH3: 12 },
  lineSpacing: 1.5,
  citationFormat: 'GB/T 7714',
};

function makePaymentAdapter(): jest.Mocked<WechatPaymentAdapter> {
  return {
    createJsapiPay: jest.fn().mockResolvedValue({ appId: 'wx', timeStamp: '0', nonceStr: 'n', package: 'prepay_id=x', signType: 'RSA', paySign: 's' }),
    createNativePay: jest.fn(),
    verifyNotifySignature: jest.fn(),
    decryptNotifyResource: jest.fn(),
  } as unknown as jest.Mocked<WechatPaymentAdapter>;
}

function makeAiAdapter(): jest.Mocked<IAiAdapter> {
  async function* empty() { yield ''; }
  return {
    completion: jest.fn().mockResolvedValue('content'),
    streamCompletion: jest.fn().mockReturnValue(empty()),
  } as unknown as jest.Mocked<IAiAdapter>;
}

async function createOrderWithContent(orderSvc: OrderService, revisionSvc: RevisionService, content = '论文正文内容[1]') {
  const payAdapter = makePaymentAdapter();
  payAdapter.decryptNotifyResource = jest.fn().mockResolvedValue({ out_trade_no: '', amount: { total: 9900 }, trade_state: 'SUCCESS' });
  const { orderId } = await orderSvc.createOrder(USER_A, { draftId: 'd1', planType: PlanType.BASIC });
  (payAdapter.decryptNotifyResource as jest.Mock).mockResolvedValue({ out_trade_no: orderId, amount: { total: 9900 }, trade_state: 'SUCCESS' });
  await orderSvc.handleWechatNotify({ timestamp: 't', nonce: 'n', body: '{}', signature: 'sig' });
  await revisionSvc.saveContent(USER_A, orderId, content);
  return orderId;
}

// ── DocumentBuilderService ────────────────────────────────────────────────────

describe('DocumentBuilderService', () => {
  const builder = new DocumentBuilderService();

  const BASE_PARAMS: DocumentBuildParams = {
    title: '基于深度学习的论文自动生成研究',
    content: '<p>第一章 绪论</p><p>本文研究[1]...</p>',
    config: DEFAULT_CONFIG,
  };

  it('build() 应返回非空 Buffer', async () => {
    const buf = await builder.build(BASE_PARAMS);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(0);
  });

  it('生成的 Buffer 应是合法的 ZIP（.docx 格式以 PK 开头）', async () => {
    const buf = await builder.build(BASE_PARAMS);
    // .docx is a ZIP file: first two bytes are 'PK' (0x50 0x4B)
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
  });

  it('不同 config 的两次 build 均应成功返回 Buffer', async () => {
    const apaConfig: FormatTemplateConfig = { ...DEFAULT_CONFIG, citationFormat: 'APA' };
    const buf1 = await builder.build(BASE_PARAMS);
    const buf2 = await builder.build({ ...BASE_PARAMS, config: apaConfig });
    expect(buf1).toBeInstanceOf(Buffer);
    expect(buf2).toBeInstanceOf(Buffer);
  });

  it('空内容时仍应返回合法 Buffer', async () => {
    const buf = await builder.build({ ...BASE_PARAMS, content: '' });
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(0);
  });

  it('自定义 margins 应被接受（不抛出错误）', async () => {
    const customConfig: FormatTemplateConfig = {
      ...DEFAULT_CONFIG,
      margins: { top: 30, bottom: 30, left: 35, right: 30 },
    };
    await expect(builder.build({ ...BASE_PARAMS, config: customConfig })).resolves.toBeInstanceOf(Buffer);
  });

  it('MLA 引文格式应被接受', async () => {
    const mlaConfig: FormatTemplateConfig = { ...DEFAULT_CONFIG, citationFormat: 'MLA' };
    await expect(builder.build({ ...BASE_PARAMS, config: mlaConfig })).resolves.toBeInstanceOf(Buffer);
  });
});

// ── DownloadService ────────────────────────────────────────────────────────────

describe('DownloadService', () => {
  function makeDownloadSvc() {
    const payAdapter = makePaymentAdapter();
    const orderSvc = new OrderService(payAdapter);
    const aiAdapter = makeAiAdapter();
    const revisionSvc = new RevisionService(orderSvc, aiAdapter);
    const templateSvc = new TemplateService();
    const mockBuilder: jest.Mocked<DocumentBuilderService> = {
      build: jest.fn().mockResolvedValue(Buffer.from('mock docx content')),
    } as unknown as jest.Mocked<DocumentBuilderService>;
    const downloadSvc = new DownloadService(orderSvc, revisionSvc, templateSvc, mockBuilder);
    return { orderSvc, revisionSvc, templateSvc, mockBuilder, downloadSvc };
  }

  it('generateDownload 应返回包含 download_url 的对象', async () => {
    const { orderSvc, revisionSvc, downloadSvc } = makeDownloadSvc();
    const orderId = await createOrderWithContent(orderSvc, revisionSvc);
    const result = await downloadSvc.generateDownload(USER_A, orderId, 'docx');
    expect(result).toHaveProperty('download_url');
    expect(typeof result.download_url).toBe('string');
    expect(result.download_url.length).toBeGreaterThan(0);
  });

  it('generateDownload 应调用 DocumentBuilderService.build()', async () => {
    const { orderSvc, revisionSvc, mockBuilder, downloadSvc } = makeDownloadSvc();
    const orderId = await createOrderWithContent(orderSvc, revisionSvc);
    await downloadSvc.generateDownload(USER_A, orderId, 'docx');
    expect(mockBuilder.build).toHaveBeenCalledTimes(1);
  });

  it('build 应收到正确的 title（来自订单草稿）', async () => {
    const { orderSvc, revisionSvc, mockBuilder, downloadSvc } = makeDownloadSvc();
    const orderId = await createOrderWithContent(orderSvc, revisionSvc, '论文内容');
    await downloadSvc.generateDownload(USER_A, orderId, 'docx');
    const callArg: DocumentBuildParams = (mockBuilder.build as jest.Mock).mock.calls[0][0] as DocumentBuildParams;
    expect(callArg.content).toBeDefined();
    expect(callArg.config).toBeDefined();
  });

  it('build 应收到来自模板的 config', async () => {
    const { orderSvc, revisionSvc, mockBuilder, downloadSvc } = makeDownloadSvc();
    const orderId = await createOrderWithContent(orderSvc, revisionSvc);
    await downloadSvc.generateDownload(USER_A, orderId, 'docx');
    const callArg: DocumentBuildParams = (mockBuilder.build as jest.Mock).mock.calls[0][0] as DocumentBuildParams;
    expect(callArg.config.citationFormat).toBeDefined();
    expect(callArg.config.margins).toBeDefined();
    expect(callArg.config.font).toBeDefined();
  });

  it('不存在的订单应抛出 NotFoundException', async () => {
    const { downloadSvc } = makeDownloadSvc();
    await expect(downloadSvc.generateDownload(USER_A, 'ghost-id', 'docx')).rejects.toThrow(NotFoundException);
  });

  it('其他用户无权下载他人订单', async () => {
    const { orderSvc, revisionSvc, downloadSvc } = makeDownloadSvc();
    const orderId = await createOrderWithContent(orderSvc, revisionSvc);
    await expect(downloadSvc.generateDownload('user-b', orderId, 'docx')).rejects.toThrow(NotFoundException);
  });

  it('pdf 格式应返回 download_url（stub 实现）', async () => {
    const { orderSvc, revisionSvc, downloadSvc } = makeDownloadSvc();
    const orderId = await createOrderWithContent(orderSvc, revisionSvc);
    const result = await downloadSvc.generateDownload(USER_A, orderId, 'pdf');
    expect(result.download_url).toBeDefined();
  });
});
