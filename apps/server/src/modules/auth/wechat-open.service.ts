import { Injectable } from '@nestjs/common';

const WECHAT_API = 'https://api.weixin.qq.com';

export interface WechatTokenResult {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  openid: string;
  scope: string;
  unionid?: string;
}

export interface WechatUserInfoResult {
  openid: string;
  nickname: string;
  headimgurl: string;
  unionid?: string;
}

@Injectable()
export class WechatOpenService {
  async exchangeCodeForToken(
    appId: string,
    appSecret: string,
    code: string,
  ): Promise<WechatTokenResult> {
    const url = new URL('/sns/oauth2/access_token', WECHAT_API);
    url.searchParams.set('appid', appId);
    url.searchParams.set('secret', appSecret);
    url.searchParams.set('code', code);
    url.searchParams.set('grant_type', 'authorization_code');
    const res = await fetch(url.toString());
    const data = (await res.json()) as { access_token?: string; openid?: string; unionid?: string; errcode?: number; errmsg?: string };
    if (data.errcode) {
      throw new Error(data.errmsg ?? `WeChat API error: ${data.errcode}`);
    }
    if (!data.access_token || !data.openid) {
      throw new Error('WeChat did not return access_token or openid');
    }
    return {
      access_token: data.access_token,
      expires_in: (data as WechatTokenResult).expires_in ?? 7200,
      refresh_token: (data as WechatTokenResult).refresh_token ?? '',
      openid: data.openid,
      scope: (data as WechatTokenResult).scope ?? 'snsapi_login',
      unionid: data.unionid,
    };
  }

  async getUserInfo(accessToken: string, openid: string): Promise<WechatUserInfoResult> {
    const url = new URL('/sns/userinfo', WECHAT_API);
    url.searchParams.set('access_token', accessToken);
    url.searchParams.set('openid', openid);
    url.searchParams.set('lang', 'zh_CN');
    const res = await fetch(url.toString());
    const data = (await res.json()) as {
      openid?: string;
      nickname?: string;
      headimgurl?: string;
      unionid?: string;
      errcode?: number;
      errmsg?: string;
    };
    if (data.errcode) {
      throw new Error(data.errmsg ?? `WeChat API error: ${data.errcode}`);
    }
    return {
      openid: data.openid ?? openid,
      nickname: data.nickname ?? '',
      headimgurl: data.headimgurl ?? '',
      unionid: data.unionid,
    };
  }
}
