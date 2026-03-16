import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Request } from 'express'
import { AdminSessionService } from '../../modules/admin-auth/admin-session.service'
import { ADMIN_ROLES_KEY } from '../decorators/admin-role.decorator'
import { AdminRole } from '@ai-paper/shared'

@Injectable()
export class AdminSessionGuard implements CanActivate {
  constructor(
    private readonly sessionService: AdminSessionService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>()
    const sessionId = this.extractSessionId(request)

    if (!sessionId) {
      throw new UnauthorizedException('No admin session')
    }

    const session = this.sessionService.getSession(sessionId)
    request['adminSession'] = session

    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(
      ADMIN_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    )

    if (!requiredRoles || requiredRoles.length === 0) {
      return true
    }

    if (!requiredRoles.includes(session.role)) {
      throw new UnauthorizedException(`Insufficient role: ${session.role}`)
    }

    return true
  }

  private extractSessionId(request: Request): string | undefined {
    return request.cookies?.['admin_session'] as string | undefined
  }
}
