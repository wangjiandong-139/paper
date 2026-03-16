import { SetMetadata } from '@nestjs/common'
import { AdminRole } from '@ai-paper/shared'

export const ADMIN_ROLES_KEY = 'adminRoles'

export const AdminRoles = (...roles: AdminRole[]) =>
  SetMetadata(ADMIN_ROLES_KEY, roles)

export const SuperAdminOnly = () => AdminRoles(AdminRole.SUPER_ADMIN)
