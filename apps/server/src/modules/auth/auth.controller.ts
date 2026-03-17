import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService, WechatLoginPayload, AuthResult, LoginWithPasswordPayload, LoginResponse } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** PC 端微信扫码登录：获取二维码 URL（占位实现，未接入微信开放平台时返回 null） */
  @Get('wechat/qrcode')
  async getWechatQrcode(): Promise<{ url: string | null }> {
    return this.authService.getWechatQrcodeUrl();
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

