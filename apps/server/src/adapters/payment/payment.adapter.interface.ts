export interface WechatJsapiPayParams {
  appId: string;
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: 'RSA' | 'MD5';
  paySign: string;
}

export interface WechatNativePayResult {
  codeUrl: string;
}

export interface WechatDecryptedNotify {
  out_trade_no: string;
  amount: { total: number };
  trade_state: string;
}

export interface IPaymentAdapter {
  createJsapiPay(
    orderId: string,
    amount: number,
    openId: string,
  ): Promise<WechatJsapiPayParams>;

  createNativePay(
    orderId: string,
    amount: number,
  ): Promise<WechatNativePayResult>;

  verifyNotifySignature(
    timestamp: string,
    nonce: string,
    body: string,
    signature: string,
  ): boolean;

  decryptNotifyResource(
    ciphertext: string,
    associatedData: string,
    nonce: string,
  ): Promise<WechatDecryptedNotify>;
}
