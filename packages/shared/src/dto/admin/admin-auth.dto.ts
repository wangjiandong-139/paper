import { AdminRole, AdminUserStatus } from '../../enums/admin/roles'

export interface AdminLoginDto {
  username: string
  password: string
}

export interface AdminLoginResponseDto {
  adminUser: AdminUserProfileDto
}

export interface AdminUserProfileDto {
  id: string
  username: string
  role: AdminRole
  status: AdminUserStatus
  lastLoginAt: string | null
}

export interface ChangePasswordDto {
  currentPassword: string
  newPassword: string
}

export interface CreateAdminUserDto {
  username: string
  password: string
  role: AdminRole
}

export interface UpdateAdminUserDto {
  role?: AdminRole
  status?: AdminUserStatus
}

export interface AdminUserListItemDto {
  id: string
  username: string
  role: AdminRole
  status: AdminUserStatus
  lastLoginAt: string | null
  createdAt: string
}

export interface PaginatedDto<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
