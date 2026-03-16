import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { DownloadModule } from './modules/download/download.module';
import { GenerationModule } from './modules/generation/generation.module';
import { OrderModule } from './modules/order/order.module';
import { RevisionModule } from './modules/revision/revision.module';
import { OutlineModule } from './modules/outline/outline.module';
import { ReferenceModule } from './modules/reference/reference.module';
import { TemplateModule } from './modules/template/template.module';
import { UserModule } from './modules/user/user.module';
import { WizardModule } from './modules/wizard/wizard.module';

@Module({
  imports: [AuthModule, UserModule, WizardModule, ReferenceModule, OutlineModule, TemplateModule, AdminModule, OrderModule, GenerationModule, RevisionModule, DownloadModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}

