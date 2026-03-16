import { Injectable } from '@nestjs/common';
import {
  IPaymentAdapter,
  WechatDecryptedNotify,
  WechatJsapiPayParams,
  WechatNativePayResult,
} from './payment.adapter.interface';

/**
 * 微信支付适配器（存根实现）
 *
 * 生产环境需配置以下环境变量：
 *   WECHAT_PAY_APP_ID、WECHAT_PAY_MCH_ID、WECHAT_PAY_API_KEY（v3 密钥）、
 *   WECHAT_PAY_CERT_SERIAL、WECHAT_PAY_PRIVATE_KEY（RSA 私钥 PEM）
 *
 * JSAPI 支付（H5 公众号）和 Native 扫码支付（PC 端）共用同一密钥体系。
 */
@Injectable()
export class WechatPaymentAdapter implements IPaymentAdapter {
  async createJsapiPay(
    orderId: string,
    amount: number,
    openId: string,
  ): Promise<WechatJsapiPayParams> {
    // 实际实现：调用微信支付 v3 unified order API（JSAPI 场景）
    // const prepayId = await this.unifiedOrder({ tradeType: 'JSAPI', orderId, amount, openId });
    // return this.buildJsapiSignParams(prepayId);
    void openId;
    void amount;
    return {
      appId: process.env.WECHAT_PAY_APP_ID ?? 'wx_stub',
      timeStamp: String(Math.floor(Date.now() / 1000)),
      nonceStr: this.randomNonce(),
      package: `prepay_id=stub_${orderId}`,
      signType: 'RSA',
      paySign: 'stub_sign',
    };
  }

  async createNativePay(
    orderId: string,
    amount: number,
  ): Promise<WechatNativePayResult> {
    // 实际实现：调用微信支付 v3 unified order API（Native 场景）
    void amount;
    return {
      codeUrl: `weixin://wxpay/bizpayurl?pr=stub_${orderId}`,
    };
  }

  verifyNotifySignature(
    timestamp: string,
    nonce: string,
    body: string,
    signature: string,
  ): boolean {
    // 实际实现：用微信平台公钥验证 RSA 签名
    // const message = `${timestamp}\n${nonce}\n${body}\n`;
    // return crypto.verify('RSA-SHA256', Buffer.from(message), wechatPubKey, Buffer.from(signature, 'base64'));
    void timestamp;
    void nonce;
    void body;
    void signature;
    return true;
  }

  async decryptNotifyResource(
    ciphertext: string,
    associatedData: string,
    nonce: string,
  ): Promise<WechatDecryptedNotify> {
    // 实际实现：用 WECHAT_PAY_API_KEY 对 AES-256-GCM 密文解密
    void ciphertext;
    void associatedData;
    void nonce;
    return {
      out_trade_no: '',
      amount: { total: 0 },
      trade_state: 'SUCCESS',
    };
  }

  private randomNonce(): string {
    return Math.random().toString(36).slice(2, 18);
  }
}
