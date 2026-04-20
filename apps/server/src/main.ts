import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}

// 仅用于本地手动启动，测试通过 Nest 测试工具创建应用实例
if (require.main === module) {
  void bootstrap();
}

