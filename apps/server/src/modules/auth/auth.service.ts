import { Injectable } from '@nestjs/common';

export interface WechatLoginPayload {
  code: string;
  platform: 'h5' | 'pc_qrcode';
}

export interface AuthUser {
  id: string;
  wechat_open_id: string;
}

export interface AuthResult {
  access_token: string;
  user: AuthUser;
}

@Injectable()
export class AuthService {
  async wechatLogin(payload: WechatLoginPayload): Promise<AuthResult> {
    // 占位实现：实际实现将调用微信 OAuth 和数据库
    return {
      access_token: `mock-token-for-${payload.code}`,
      user: {
        id: 'mock-user-id',
        wechat_open_id: 'mock-open-id',
      },
    };
  }
}

