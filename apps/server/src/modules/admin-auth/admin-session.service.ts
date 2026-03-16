import { Injectable, UnauthorizedException } from '@nestjs/common'
import { AdminRole } from '@ai-paper/shared'
import { randomUUID } from 'crypto'

export interface AdminSession {
  sessionId: string
  adminUserId: string
  role: AdminRole
  lastSeenAt: Date
  expiresAt: Date
}

const SESSION_TTL_MS = 8 * 60 * 60 * 1000 // 8 hours

@Injectable()
export class AdminSessionService {
  // In-memory session store (replace with Redis in production)
  private readonly sessions = new Map<string, AdminSession>()

  createSession(adminUserId: string, role: AdminRole): string {
    const sessionId = randomUUID()
    const now = new Date()
    const session: AdminSession = {
      sessionId,
      adminUserId,
      role,
      lastSeenAt: now,
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
    }
    this.sessions.set(sessionId, session)
    return sessionId
  }

  getSession(sessionId: string): AdminSession {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new UnauthorizedException('Session not found')
    }
    if (session.expiresAt < new Date()) {
      this.sessions.delete(sessionId)
      throw new UnauthorizedException('Session expired')
    }
    session.lastSeenAt = new Date()
    session.expiresAt = new Date(Date.now() + SESSION_TTL_MS)
    return session
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId)
  }

  deleteAllSessionsForUser(adminUserId: string): void {
    for (const [id, session] of this.sessions.entries()) {
      if (session.adminUserId === adminUserId) {
        this.sessions.delete(id)
      }
    }
  }
}
