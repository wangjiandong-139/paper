import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { OutlineNode } from '../outline/outline.service';
import { Draft, DraftReferenceItem, WizardService } from './wizard.service';

interface AuthedRequest extends Request {
  user?: { id: string };
}

@Controller('api/drafts')
@UseGuards(JwtAuthGuard)
export class WizardController {
  constructor(private readonly wizardService: WizardService) {}

  private getUserId(req: AuthedRequest): string {
    return ((req.user && (req.user.id as string)) || 'mock-user-id') as string;
  }

  @Get()
  async list(@Req() req: AuthedRequest): Promise<Draft[]> {
    const userId = this.getUserId(req);
    return this.wizardService.listDrafts(userId);
  }

  @Post()
  async create(@Req() req: AuthedRequest): Promise<Draft> {
    const userId = this.getUserId(req);
    return this.wizardService.createDraft(userId);
  }

  @Patch(':id/step/:step')
  async updateStep(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Param('step', ParseIntPipe) step: number,
    @Body() body: Record<string, unknown>,
  ): Promise<Draft> {
    const userId = this.getUserId(req);
    return this.wizardService.updateDraftStep(userId, id, step, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Req() req: AuthedRequest, @Param('id') id: string): Promise<void> {
    const userId = this.getUserId(req);
    await this.wizardService.softDeleteDraft(userId, id);
  }

  @Post(':id/references')
  async addReference(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: DraftReferenceItem,
  ): Promise<Draft> {
    const userId = this.getUserId(req);
    return this.wizardService.addReference(userId, id, body);
  }

  @Delete(':id/references/:refId')
  @HttpCode(200)
  async removeReference(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Param('refId') refId: string,
  ): Promise<Draft> {
    const userId = this.getUserId(req);
    return this.wizardService.removeReference(userId, id, refId);
  }

  @Patch(':id/outline')
  async saveOutline(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: OutlineNode[],
  ): Promise<Draft> {
    const userId = this.getUserId(req);
    return this.wizardService.saveOutline(userId, id, body);
  }
}

