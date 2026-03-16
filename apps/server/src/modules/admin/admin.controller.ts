import { Body, Controller, Get, NotFoundException, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { SystemConfigDTO, SystemConfigService } from './system-config.service';

@UseGuards(JwtAuthGuard)
@Controller('api/admin/system-configs')
export class AdminConfigController {
  constructor(private readonly configService: SystemConfigService) {}

  @Get()
  async listAll(): Promise<SystemConfigDTO[]> {
    return this.configService.listAll();
  }

  @Patch(':key')
  async update(
    @Param('key') key: string,
    @Body() body: { value: string },
  ): Promise<SystemConfigDTO> {
    try {
      return await this.configService.set(key, body.value);
    } catch {
      throw new NotFoundException(`Config key "${key}" not found`);
    }
  }
}
