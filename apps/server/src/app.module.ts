import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { WizardModule } from './modules/wizard/wizard.module';

@Module({
  imports: [AuthModule, UserModule, WizardModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}

