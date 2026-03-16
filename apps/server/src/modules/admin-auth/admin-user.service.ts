import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { AdminRole, AdminUserStatus } from '@ai-paper/shared'

export interface AdminUserRecord {
  id: string
  username: string
  passwordHash: string
  role: AdminRole
  status: AdminUserStatus
  failedLoginAttempts: number
  lockedUntil: Date | null
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
}

const BCRYPT_ROUNDS = 12
const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 30 * 60 * 1000 // 30 minutes

function validatePasswordComplexity(password: string): void {
  if (password.length < 8) {
    throw new BadRequestException('密码长度不得少于8位')
  }
  if (!/[a-zA-Z]/.test(password)) {
    throw new BadRequestException('密码必须包含字母')
  }
  if (!/[0-9]/.test(password)) {
    throw new BadRequestException('密码必须包含数字')
  }
}

@Injectable()
export class AdminUserService {
  // In-memory store as placeholder; replace with Prisma in full implementation
  private readonly users = new Map<string, AdminUserRecord>()
  private idCounter = 0

  async createUser(
    username: string,
    password: string,
    role: AdminRole,
  ): Promise<AdminUserRecord> {
    if (this.findByUsername(username)) {
      throw new ConflictException(`Username ${username} already exists`)
    }
    validatePasswordComplexity(password)
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
    const now = new Date()
    const user: AdminUserRecord = {
      id: `admin-${++this.idCounter}`,
      username,
      passwordHash,
      role,
      status: AdminUserStatus.ACTIVE,
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    }
    this.users.set(user.id, user)
    return user
  }

  findById(id: string): AdminUserRecord | undefined {
    return this.users.get(id)
  }

  findByUsername(username: string): AdminUserRecord | undefined {
    for (const user of this.users.values()) {
      if (user.username === username) return user
    }
    return undefined
  }

  listUsers(): AdminUserRecord[] {
    return Array.from(this.users.values())
  }

  async validatePassword(
    user: AdminUserRecord,
    plainPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, user.passwordHash)
  }

  async handleLoginSuccess(userId: string): Promise<void> {
    const user = this.users.get(userId)
    if (!user) return
    user.failedLoginAttempts = 0
    user.lockedUntil = null
    user.lastLoginAt = new Date()
    user.updatedAt = new Date()
  }

  async handleLoginFailure(userId: string): Promise<AdminUserRecord> {
    const user = this.users.get(userId)
    if (!user) throw new NotFoundException('User not found')
    user.failedLoginAttempts += 1
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.status = AdminUserStatus.LOCKED
      user.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS)
    }
    user.updatedAt = new Date()
    return user
  }

  checkLockStatus(user: AdminUserRecord): void {
    if (user.status === AdminUserStatus.LOCKED) {
      if (user.lockedUntil && user.lockedUntil <= new Date()) {
        user.status = AdminUserStatus.ACTIVE
        user.failedLoginAttempts = 0
        user.lockedUntil = null
      } else {
        throw new BadRequestException('Account is locked due to too many failed login attempts')
      }
    }
    if (user.status === AdminUserStatus.DISABLED) {
      throw new BadRequestException('Account is disabled')
    }
  }

  async updateRole(adminId: string, targetUserId: string, newRole: AdminRole): Promise<AdminUserRecord> {
    const target = this.users.get(targetUserId)
    if (!target) throw new NotFoundException('Admin user not found')

    if (newRole !== AdminRole.SUPER_ADMIN && target.role === AdminRole.SUPER_ADMIN) {
      this.assertNotLastSuperAdmin(targetUserId)
    }

    target.role = newRole
    target.updatedAt = new Date()
    return target
  }

  async updateStatus(adminId: string, targetUserId: string, newStatus: AdminUserStatus): Promise<AdminUserRecord> {
    const target = this.users.get(targetUserId)
    if (!target) throw new NotFoundException('Admin user not found')

    if (
      (newStatus === AdminUserStatus.DISABLED || newStatus === AdminUserStatus.LOCKED) &&
      target.role === AdminRole.SUPER_ADMIN
    ) {
      this.assertNotLastSuperAdmin(targetUserId)
    }

    target.status = newStatus
    target.updatedAt = new Date()
    return target
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = this.users.get(userId)
    if (!user) throw new NotFoundException('Admin user not found')

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect')
    }

    validatePasswordComplexity(newPassword)
    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
    user.updatedAt = new Date()
  }

  private assertNotLastSuperAdmin(excludeUserId: string): void {
    const activeSuperAdmins = Array.from(this.users.values()).filter(
      (u) => u.role === AdminRole.SUPER_ADMIN && u.status === AdminUserStatus.ACTIVE && u.id !== excludeUserId,
    )
    if (activeSuperAdmins.length === 0) {
      throw new BadRequestException('Cannot disable or demote the last active super admin')
    }
  }
}
