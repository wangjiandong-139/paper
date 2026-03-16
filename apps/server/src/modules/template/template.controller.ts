import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import {
  FormatTemplateCreateDTO,
  FormatTemplateDTO,
  TemplateService,
} from './template.service';

@Controller('api/templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Get()
  async list(@Query('keyword') keyword?: string): Promise<FormatTemplateDTO[]> {
    return this.templateService.list(keyword);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<FormatTemplateDTO> {
    const template = await this.templateService.findById(id);
    if (!template) throw new NotFoundException(`Template ${id} not found`);
    return template;
  }
}

@UseGuards(JwtAuthGuard)
@Controller('api/admin/templates')
export class AdminTemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Post()
  async create(@Body() dto: FormatTemplateCreateDTO): Promise<FormatTemplateDTO> {
    return this.templateService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<FormatTemplateCreateDTO>,
  ): Promise<FormatTemplateDTO> {
    const updated = await this.templateService.update(id, dto);
    if (!updated) throw new NotFoundException(`Template ${id} not found`);
    return updated;
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    const removed = await this.templateService.remove(id);
    if (!removed) throw new NotFoundException(`Template ${id} not found`);
  }
}
