import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../common/prisma.service';

const BCRYPT_ROUNDS = 10;

export interface WechatLoginPayload {
  code: string;
  platform: 'h5' | 'pc_qrcode';
}

export interface LoginWithPasswordPayload {
  username: string;
  password: string;
}

export interface AuthUser {
  id: string;
  wechat_open_id: string;
  nickname?: string;
  avatar_url?: string;
}

export interface AuthResult {
  access_token: string;
  user: AuthUser;
}

/** 前端期望的登录响应形态（token + user） */
export interface LoginResponse {
  token: string;
  user: {
    userId: string;
    wechatOpenId: string;
    nickname: string | null;
    avatarUrl: string | null;
    onboardingCompleted: boolean;
  };
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
  }

  async verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  /** PC 端扫码登录：获取二维码 URL。未接入微信开放平台时返回 null。 */
  async getWechatQrcodeUrl(): Promise<{ url: string | null }> {
    return { url: null };
  }

  async wechatLogin(payload: WechatLoginPayload): Promise<AuthResult> {
    // 占位实现：实际实现将调用微信 OAuth 和数据库
    return {
      access_token: `mock-token-for-${payload.code}`,
      user: {
        id: 'mock-user-id',
        wechat_open_id: 'mock-open-id',
        nickname: 'mock-nickname',
        avatar_url: 'https://example.com/avatar.png',
      },
    };
  }

  async loginWithPassword(payload: LoginWithPasswordPayload): Promise<LoginResponse> {
    const cred = await this.prisma.localCredential.findUnique({
      where: { username: payload.username },
      include: { user: true },
    });
    if (!cred || !(await this.verifyPassword(payload.password, cred.password_hash))) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    const token = `local-${randomUUID()}`;
    return {
      token,
      user: {
        userId: cred.user.id,
        wechatOpenId: cred.user.wechat_open_id,
        nickname: cred.user.nickname,
        avatarUrl: cred.user.avatar_url,
        onboardingCompleted: cred.user.onboarding_completed,
      },
    };
  }
}

