import { Controller, Get, Header } from '@nestjs/common';
import { SystemConfigService } from './system-config.service';

@Controller('api/config')
export class PublicConfigController {
  constructor(private readonly configService: SystemConfigService) {}

  @Get('public')
  @Header('Cache-Control', 'public, max-age=60')
  async getPublic(): Promise<{ minReferenceCount: number; maintenanceMode: boolean }> {
    const minRef = await this.configService.get('min_reference_count');
    const maintenance = await this.configService.get('maintenance_mode');
    const minReferenceCount = Math.max(1, parseInt(minRef ?? '1', 10) || 1);
    const maintenanceMode = maintenance === 'true';
    return { minReferenceCount, maintenanceMode };
  }
}
