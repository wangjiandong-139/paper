import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService, WechatLoginPayload, AuthResult, LoginWithPasswordPayload, LoginResponse } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** PC 端微信扫码登录：获取二维码 URL 与 state（未配置时 url 与 state 为 null） */
  @Get('wechat/qrcode')
  async getWechatQrcode(): Promise<{ url: string | null; state: string | null }> {
    return this.authService.getWechatQrcodeUrl();
  }

  /** 微信 OAuth2 回调：校验 state/code，换 token，写 User，302 到前端登录页 */
  @Get('wechat/callback')
  async wechatCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ): Promise<void> {
    const { redirectUrl } = await this.authService.handleWechatCallback(code ?? '', state ?? '');
    res.redirect(302, redirectUrl);
  }

  /** 轮询扫码结果：?state=xxx，返回 pending | expired | confirmed(+ token + user) */
  @Get('wechat/qrcode/poll')
  async wechatQrcodePoll(
    @Query('state') state: string,
  ): Promise<
    | { status: 'pending' }
    | { status: 'expired' }
    | { status: 'confirmed'; token: string; user: LoginResponse['user'] }
  > {
    return this.authService.getWechatPoll(state ?? '');
  }

  /** 开发环境专用：手动将某个 state 标记为已确认，便于本地测试扫码登录 */
  @Get('wechat/dev-confirm')
  async wechatDevConfirm(
    @Query('state') state: string,
  ): Promise<{ ok: boolean }> {
    return this.authService.devConfirmState(state ?? '');
  }

  @Post('wechat')
  async wechatLogin(@Body() body: WechatLoginPayload): Promise<AuthResult> {
    return this.authService.wechatLogin(body);
  }

  @Post('login')
  async login(@Body() body: LoginWithPasswordPayload): Promise<LoginResponse> {
    return this.authService.loginWithPassword(body);
  }
}

