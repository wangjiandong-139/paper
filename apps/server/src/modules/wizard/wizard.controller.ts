import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { Draft, WizardService } from './wizard.service';

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
  async remove(@Req() req: AuthedRequest, @Param('id') id: string): Promise<void> {
    const userId = this.getUserId(req);
    await this.wizardService.softDeleteDraft(userId, id);
  }
}

