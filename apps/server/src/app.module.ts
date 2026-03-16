import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { OutlineModule } from './modules/outline/outline.module';
import { ReferenceModule } from './modules/reference/reference.module';
import { TemplateModule } from './modules/template/template.module';
import { UserModule } from './modules/user/user.module';
import { WizardModule } from './modules/wizard/wizard.module';

@Module({
  imports: [AuthModule, UserModule, WizardModule, ReferenceModule, OutlineModule, TemplateModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}

