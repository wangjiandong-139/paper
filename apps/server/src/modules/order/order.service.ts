import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { OrderStatus, PlanType } from '../../../../../packages/shared/src/enums';
import {
  WechatDecryptedNotify,
  WechatJsapiPayParams,
} from '../../adapters/payment/payment.adapter.interface';
import { WechatPaymentAdapter } from '../../adapters/payment/wechat-payment.adapter';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CreateOrderDTO {
  draftId: string;
  planType: PlanType;
}

export interface OrderSummaryDTO {
  id: string;
  planType: PlanType;
  status: OrderStatus;
  amount: number;
  createdAt: Date;
}

export interface OrderDetailDTO extends OrderSummaryDTO {
  draftId: string;
  aiRevisionCount: number;
  updatedAt: Date;
}

export interface CreateOrderResult {
  orderId: string;
  payParams: WechatJsapiPayParams;
}

export interface WechatNotifyHeaders {
  timestamp: string;
  nonce: string;
  body: string;
  signature: string;
}

// ── Internal entity ───────────────────────────────────────────────────────────

interface OrderEntity {
  id: string;
  userId: string;
  draftId: string;
  planType: PlanType;
  status: OrderStatus;
  amount: number;
  aiRevisionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ── Plan prices (in fen, 1 CNY = 100 fen) ─────────────────────────────────────

const PLAN_PRICES: Record<PlanType, number> = {
  [PlanType.BASIC]: 9900, // 99 CNY
};

@Injectable()
export class OrderService {
  private readonly orders = new Map<string, OrderEntity>();

  constructor(private readonly paymentAdapter: WechatPaymentAdapter) {}

  async createOrder(
    userId: string,
    dto: CreateOrderDTO,
  ): Promise<CreateOrderResult> {
    const amount = PLAN_PRICES[dto.planType];
    const orderId = randomUUID();
    const now = new Date();

    const order: OrderEntity = {
      id: orderId,
      userId,
      draftId: dto.draftId,
      planType: dto.planType,
      status: OrderStatus.PENDING_PAYMENT,
      amount,
      aiRevisionCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.orders.set(orderId, order);

    // openId would normally come from user session; pass userId as placeholder
    const payParams = await this.paymentAdapter.createJsapiPay(orderId, amount, userId);

    return { orderId, payParams };
  }

  async listOrders(userId: string): Promise<OrderSummaryDTO[]> {
    return Array.from(this.orders.values())
      .filter((o) => o.userId === userId)
      .map(this.toSummaryDTO);
  }

  async getOrder(userId: string, orderId: string): Promise<OrderDetailDTO | null> {
    const order = this.orders.get(orderId);
    if (!order || order.userId !== userId) return null;
    return this.toDetailDTO(order);
  }

  /**
   * 处理微信支付回调（异步通知）
   * 1. 验证签名
   * 2. 解密回调 resource（body 中包含 ciphertext 等字段）
   * 3. 校验金额防篡改
   * 4. 幂等处理：非 PENDING_PAYMENT 状态直接返回 true
   * 5. 更新状态为 GENERATING
   */
  async handleWechatNotify(headers: WechatNotifyHeaders): Promise<boolean> {
    const signOk = this.paymentAdapter.verifyNotifySignature(
      headers.timestamp,
      headers.nonce,
      headers.body,
      headers.signature,
    );
    if (!signOk) return false;

    let decrypted: WechatDecryptedNotify;
    try {
      decrypted = await this.paymentAdapter.decryptNotifyResource(
        headers.body,
        headers.timestamp,
        headers.nonce,
      );
    } catch {
      return false;
    }

    const order = this.orders.get(decrypted.out_trade_no);
    if (!order) return false;

    // Idempotency: already processed
    if (order.status !== OrderStatus.PENDING_PAYMENT) return true;

    // Amount tampering check
    if (decrypted.amount.total !== order.amount) return false;

    if (decrypted.trade_state !== 'SUCCESS') return false;

    this.updateOrderStatus(order.id, OrderStatus.GENERATING);
    return true;
  }

  async markOrderCompleted(orderId: string): Promise<void> {
    const order = this.orders.get(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);
    this.updateOrderStatus(orderId, OrderStatus.COMPLETED);
  }

  async markOrderFailed(orderId: string): Promise<void> {
    const order = this.orders.get(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);
    this.updateOrderStatus(orderId, OrderStatus.FAILED);
  }

  async incrementAiRevisionCount(orderId: string): Promise<number> {
    const order = this.orders.get(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);
    const updated = { ...order, aiRevisionCount: order.aiRevisionCount + 1, updatedAt: new Date() };
    this.orders.set(orderId, updated);
    return updated.aiRevisionCount;
  }

  async getAiRevisionCount(orderId: string): Promise<number> {
    const order = this.orders.get(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);
    return order.aiRevisionCount;
  }

  private updateOrderStatus(orderId: string, status: OrderStatus): void {
    const order = this.orders.get(orderId);
    if (!order) return;
    this.orders.set(orderId, { ...order, status, updatedAt: new Date() });
  }

  private toSummaryDTO(order: OrderEntity): OrderSummaryDTO {
    return {
      id: order.id,
      planType: order.planType,
      status: order.status,
      amount: order.amount,
      createdAt: order.createdAt,
    };
  }

  private toDetailDTO(order: OrderEntity): OrderDetailDTO {
    return {
      ...this.toSummaryDTO(order),
      draftId: order.draftId,
      aiRevisionCount: order.aiRevisionCount,
      updatedAt: order.updatedAt,
    };
  }
}
