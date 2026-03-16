import { ForbiddenException } from '@nestjs/common'
import { AdminRole } from '@ai-paper/shared'

export type AdminAction =
  | 'orders:read'
  | 'orders:retry'
  | 'orders:cancel'
  | 'orders:export'
  | 'orders:note'
  | 'generation-jobs:read'
  | 'generation-jobs:retry'
  | 'generation-jobs:cancel'
  | 'templates:read'
  | 'templates:write'
  | 'template-requests:read'
  | 'template-requests:fulfill'
  | 'users:read'
  | 'users:risk-control'
  | 'admin-users:read'
  | 'admin-users:write'
  | 'configs:read'
  | 'configs:write'
  | 'dashboard:read'
  | 'operation-logs:read'
  | 'products:read'
  | 'products:write'
  | 'payments:read'

const ROLE_PERMISSIONS: Record<AdminRole, AdminAction[]> = {
  [AdminRole.SUPER_ADMIN]: [
    'orders:read', 'orders:retry', 'orders:cancel', 'orders:export', 'orders:note',
    'generation-jobs:read', 'generation-jobs:retry', 'generation-jobs:cancel',
    'templates:read', 'templates:write',
    'template-requests:read', 'template-requests:fulfill',
    'users:read', 'users:risk-control',
    'admin-users:read', 'admin-users:write',
    'configs:read', 'configs:write',
    'dashboard:read',
    'operation-logs:read',
    'products:read', 'products:write',
    'payments:read',
  ],
  [AdminRole.OPERATOR]: [
    'orders:read', 'orders:retry', 'orders:cancel', 'orders:export', 'orders:note',
    'generation-jobs:read', 'generation-jobs:retry', 'generation-jobs:cancel',
    'templates:read', 'templates:write',
    'template-requests:read', 'template-requests:fulfill',
    'users:read', 'users:risk-control',
    'dashboard:read',
    'operation-logs:read',
    'products:read',
    'payments:read',
  ],
  [AdminRole.CUSTOMER_SERVICE]: [
    'orders:read',
    'generation-jobs:read',
    'templates:read',
    'template-requests:read',
    'users:read',
    'dashboard:read',
    'operation-logs:read',
    'payments:read',
  ],
  [AdminRole.READ_ONLY]: [
    'orders:read',
    'generation-jobs:read',
    'templates:read',
    'template-requests:read',
    'users:read',
    'admin-users:read',
    'configs:read',
    'dashboard:read',
    'operation-logs:read',
    'products:read',
    'payments:read',
  ],
}

export function assertPermission(role: AdminRole, action: AdminAction): void {
  const allowed = ROLE_PERMISSIONS[role] ?? []
  if (!allowed.includes(action)) {
    throw new ForbiddenException(`Role ${role} is not allowed to perform ${action}`)
  }
}

export function hasPermission(role: AdminRole, action: AdminAction): boolean {
  return (ROLE_PERMISSIONS[role] ?? []).includes(action)
}
