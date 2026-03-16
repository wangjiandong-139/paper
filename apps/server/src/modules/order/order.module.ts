import { Module } from '@nestjs/common';
import { WechatPaymentAdapter } from '../../adapters/payment/wechat-payment.adapter';
import { OrderController, WechatPayNotifyController } from './order.controller';
import { OrderService } from './order.service';

@Module({
  controllers: [OrderController, WechatPayNotifyController],
  providers: [OrderService, WechatPaymentAdapter],
  exports: [OrderService],
})
export class OrderModule {}
