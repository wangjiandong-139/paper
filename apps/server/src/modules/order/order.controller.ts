import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import {
  CreateOrderDTO,
  CreateOrderResult,
  OrderDetailDTO,
  OrderService,
  OrderSummaryDTO,
  WechatNotifyHeaders,
} from './order.service';

interface AuthedRequest extends Request {
  user?: { id: string };
}

@UseGuards(JwtAuthGuard)
@Controller('api/orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  async createOrder(
    @Req() req: AuthedRequest,
    @Body() dto: CreateOrderDTO,
  ): Promise<CreateOrderResult> {
    const userId = req.user?.id ?? 'mock-user-id';
    return this.orderService.createOrder(userId, dto);
  }

  @Get()
  async listOrders(@Req() req: AuthedRequest): Promise<OrderSummaryDTO[]> {
    const userId = req.user?.id ?? 'mock-user-id';
    return this.orderService.listOrders(userId);
  }

  @Get(':id')
  async getOrder(
    @Req() req: AuthedRequest,
    @Param('id') orderId: string,
  ): Promise<OrderDetailDTO> {
    const userId = req.user?.id ?? 'mock-user-id';
    const order = await this.orderService.getOrder(userId, orderId);
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    return order;
  }
}

/**
 * 微信支付回调接口（不需要 JWT 认证，由微信服务器调用）
 * 路由：POST /api/orders/:id/wechat-pay/notify
 */
@Controller('api/orders')
export class WechatPayNotifyController {
  constructor(private readonly orderService: OrderService) {}

  @Post(':id/wechat-pay/notify')
  @HttpCode(200)
  async handleNotify(
    @Req() req: AuthedRequest & { headers: Record<string, string>; body: string },
  ): Promise<{ code: string; message: string }> {
    const headers: WechatNotifyHeaders = {
      timestamp: (req.headers['wechatpay-timestamp'] as string) ?? '',
      nonce: (req.headers['wechatpay-nonce'] as string) ?? '',
      body: JSON.stringify(req.body),
      signature: (req.headers['wechatpay-signature'] as string) ?? '',
    };

    const ok = await this.orderService.handleWechatNotify(headers);
    if (!ok) {
      return { code: 'FAIL', message: '签名验证失败或金额不匹配' };
    }
    return { code: 'SUCCESS', message: 'OK' };
  }
}
