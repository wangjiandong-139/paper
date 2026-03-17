import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../common/prisma.service';
import { SystemConfigService } from '../admin/system-config.service';
import { WechatOpenService } from './wechat-open.service';
import { WechatStateStore } from './wechat-state.store';

const BCRYPT_ROUNDS = 10;

const QRCONNECT_BASE = 'https://open.weixin.qq.com/connect/qrconnect';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly systemConfig: SystemConfigService,
    private readonly wechatState: WechatStateStore,
    private readonly wechatOpen: WechatOpenService,
  ) {}

  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
  }

  async verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  /** PC 端扫码登录：获取二维码 URL 与 state。未配置 AppID/AppSecret 时返回 null。 */
  async getWechatQrcodeUrl(): Promise<{ url: string | null; state: string | null }> {
    const appId = await this.systemConfig.get('wechat_open_app_id');
    const appSecret = await this.systemConfig.get('wechat_open_app_secret');
    if (!appId?.trim() || !appSecret?.trim()) {
      return { url: null, state: null };
    }
    const callbackBase = process.env.WECHAT_CALLBACK_BASE ?? '';
    if (!callbackBase) {
      return { url: null, state: null };
    }
    const state = randomUUID();
    this.wechatState.setPending(state);
    const redirectUri = `${callbackBase.replace(/\/$/, '')}/api/auth/wechat/callback`;
    const url = `${QRCONNECT_BASE}?appid=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=snsapi_login&state=${encodeURIComponent(state)}#wechat_redirect`;
    return { url, state };
  }

  /**
   * 处理微信 OAuth2 回调：用 code 换 token、拉用户信息、查/建 User、签发 token、写 state 为 confirmed。
   * 返回前端登录页 URL（302 重定向目标）。
   */
  async handleWechatCallback(code: string, state: string): Promise<{ redirectUrl: string }> {
    const frontendUrl = process.env.FRONTEND_URL ?? '';
    const isDevMock = process.env.WECHAT_DEV_MODE === 'true' || process.env.NODE_ENV !== 'production';
    const loginPath = '/login';
    const fallbackRedirect = frontendUrl ? `${frontendUrl.replace(/\/$/, '')}${loginPath}` : loginPath;

    const entry = this.wechatState.get(state);
    if (!entry || entry.status !== 'pending') {
      return { redirectUrl: `${fallbackRedirect}?wechat_error=invalid_state` };
    }

    // 开发 / 测试环境：不调用微信接口，直接模拟登录，方便本地调试扫码流程
    if (isDevMock) {
      const openId = `dev-openid-${state}`;
      let user = await this.prisma.user.findUnique({
        where: { wechat_open_id: openId },
      });
      if (!user) {
        user = await this.prisma.user.create({
          data: {
            wechat_open_id: openId,
            wechat_union_id: null,
            nickname: '本地测试用户',
            avatar_url: null,
          },
        });
      }
      const token = `wechat-dev-${randomUUID()}`;
      const loginUser = {
        userId: user.id,
        wechatOpenId: user.wechat_open_id,
        nickname: user.nickname,
        avatarUrl: user.avatar_url,
        onboardingCompleted: user.onboarding_completed,
      };
      this.wechatState.setConfirmed(state, token, loginUser);
      const redirectUrl = `${fallbackRedirect}?wechat_done=1&state=${encodeURIComponent(state)}&dev=1`;
      return { redirectUrl };
    }

    if (!code?.trim()) {
      return { redirectUrl: `${fallbackRedirect}?wechat_error=no_code` };
    }

    const appId = await this.systemConfig.get('wechat_open_app_id');
    const appSecret = await this.systemConfig.get('wechat_open_app_secret');
    if (!appId?.trim() || !appSecret?.trim()) {
      return { redirectUrl: `${fallbackRedirect}?wechat_error=config` };
    }

    let tokenResult: Awaited<ReturnType<WechatOpenService['exchangeCodeForToken']>>;
    try {
      tokenResult = await this.wechatOpen.exchangeCodeForToken(appId, appSecret, code);
    } catch {
      return { redirectUrl: `${fallbackRedirect}?wechat_error=exchange` };
    }

    let userInfo: Awaited<ReturnType<WechatOpenService['getUserInfo']>>;
    try {
      userInfo = await this.wechatOpen.getUserInfo(tokenResult.access_token, tokenResult.openid);
    } catch {
      userInfo = {
        openid: tokenResult.openid,
        nickname: '',
        headimgurl: '',
        unionid: tokenResult.unionid,
      };
    }

    let user = await this.prisma.user.findUnique({
      where: { wechat_open_id: tokenResult.openid },
    });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          wechat_open_id: tokenResult.openid,
          wechat_union_id: tokenResult.unionid ?? userInfo.unionid ?? null,
          nickname: userInfo.nickname || null,
          avatar_url: userInfo.headimgurl || null,
        },
      });
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          nickname: userInfo.nickname || user.nickname,
          avatar_url: userInfo.headimgurl || user.avatar_url,
          wechat_union_id: user.wechat_union_id ?? tokenResult.unionid ?? userInfo.unionid ?? null,
        },
      });
    }

    const token = `wechat-${randomUUID()}`;
    const loginUser = {
      userId: user.id,
      wechatOpenId: user.wechat_open_id,
      nickname: user.nickname,
      avatarUrl: user.avatar_url,
      onboardingCompleted: user.onboarding_completed,
    };
    this.wechatState.setConfirmed(state, token, loginUser);

    const redirectUrl = `${fallbackRedirect}?wechat_done=1&state=${encodeURIComponent(state)}`;
    return { redirectUrl };
  }

  /**
   * 轮询扫码状态。state 不存在或过期返回 expired；pending 返回 pending；confirmed 返回 token+user 并消费 state。
   */
  async getWechatPoll(state: string): Promise<
    | { status: 'pending' }
    | { status: 'expired' }
    | { status: 'confirmed'; token: string; user: LoginResponse['user'] }
  > {
    if (!state?.trim()) {
      return { status: 'expired' };
    }
    const value = this.wechatState.getAndConsumeIfConfirmed(state);
    if (!value) return { status: 'expired' };
    if (value.status === 'pending') return { status: 'pending' };
    return {
      status: 'confirmed',
      token: value.token,
      user: value.user,
    };
  }

  /** 开发环境专用：手动将某个 state 标记为已确认，方便本地联调 */
  async devConfirmState(state: string): Promise<{ ok: boolean }> {
    if (!state?.trim()) return { ok: false };
    const isDevMock = process.env.WECHAT_DEV_MODE === 'true' || process.env.NODE_ENV !== 'production';
    if (!isDevMock) return { ok: false };
    const existing = this.wechatState.get(state);
    if (!existing) return { ok: false };
    if (existing.status === 'confirmed') return { ok: true };

    const openId = `dev-openid-${state}`;
    let user = await this.prisma.user.findUnique({
      where: { wechat_open_id: openId },
    });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          wechat_open_id: openId,
          wechat_union_id: null,
          nickname: '本地测试用户',
          avatar_url: null,
        },
      });
    }
    const token = `wechat-dev-${randomUUID()}`;
    const loginUser: LoginResponse['user'] = {
      userId: user.id,
      wechatOpenId: user.wechat_open_id,
      nickname: user.nickname,
      avatarUrl: user.avatar_url,
      onboardingCompleted: user.onboarding_completed,
    };
    this.wechatState.setConfirmed(state, token, loginUser);
    return { ok: true };
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

