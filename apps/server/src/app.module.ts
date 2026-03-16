import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrderModule } from './modules/order/order.module';
import { OutlineModule } from './modules/outline/outline.module';
import { ReferenceModule } from './modules/reference/reference.module';
import { TemplateModule } from './modules/template/template.module';
import { UserModule } from './modules/user/user.module';
import { WizardModule } from './modules/wizard/wizard.module';

@Module({
  imports: [AuthModule, UserModule, WizardModule, ReferenceModule, OutlineModule, TemplateModule, AdminModule, OrderModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}

