import { Body, Controller, Post } from '@nestjs/common';
import { AuthService, WechatLoginPayload, AuthResult, LoginWithPasswordPayload, LoginResponse } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('wechat')
  async wechatLogin(@Body() body: WechatLoginPayload): Promise<AuthResult> {
    return this.authService.wechatLogin(body);
  }

  @Post('login')
  async login(@Body() body: LoginWithPasswordPayload): Promise<LoginResponse> {
    return this.authService.loginWithPassword(body);
  }
}

