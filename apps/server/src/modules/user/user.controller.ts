import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { UpdateMeDto, UserService, UserProfile } from './user.service';

interface AuthedRequest extends Request {
  user?: { id: string };
}

@Controller('api/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req: AuthedRequest): Promise<UserProfile> {
    const userId = (req.user?.id as string) ?? 'mock-user-id';
    return this.userService.getMe(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(@Req() req: AuthedRequest, @Body() body: UpdateMeDto): Promise<UserProfile> {
    const userId = (req.user?.id as string) ?? 'mock-user-id';
    return this.userService.updateMe(userId, body);
  }
}

