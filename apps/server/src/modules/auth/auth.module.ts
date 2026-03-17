import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { WechatOpenService } from './wechat-open.service';
import { WechatStateStore } from './wechat-state.store';

@Module({
  imports: [AdminModule],
  controllers: [AuthController],
  providers: [AuthService, WechatStateStore, WechatOpenService],
  exports: [AuthService],
})
export class AuthModule {}

