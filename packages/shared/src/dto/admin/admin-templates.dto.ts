import { SchoolTemplateStatus, DegreeType, TemplateRequestStatus } from '../../enums/admin/order-status'

export interface AdminTemplateListQueryDto {
  search?: string
  status?: SchoolTemplateStatus
  degreeType?: DegreeType
  page?: number
  pageSize?: number
}

export interface AdminTemplateListItemDto {
  id: string
  schoolName: string
  degreeType: DegreeType
  citationStyle: string
  status: SchoolTemplateStatus
  createdAt: string
  updatedAt: string
}

export interface AdminTemplateDetailDto extends AdminTemplateListItemDto {
  templateFilePath: string
  headingConfigJson: Record<string, unknown>
  pageLayoutJson: Record<string, unknown>
  createdByAdminUserId: string
  updatedByAdminUserId: string
}

export interface CreateSchoolTemplateDto {
  schoolName: string
  degreeType: DegreeType
  citationStyle: string
  templateFilePath: string
  headingConfigJson: Record<string, unknown>
  pageLayoutJson: Record<string, unknown>
}

export interface UpdateSchoolTemplateDto {
  schoolName?: string
  citationStyle?: string
  templateFilePath?: string
  headingConfigJson?: Record<string, unknown>
  pageLayoutJson?: Record<string, unknown>
}

export interface TemplateRequestListQueryDto {
  status?: TemplateRequestStatus
  page?: number
  pageSize?: number
}

export interface TemplateRequestListItemDto {
  id: string
  userId: string
  schoolName: string
  degreeType: DegreeType
  status: TemplateRequestStatus
  linkedTemplateId: string | null
  createdAt: string
}

export interface FulfillTemplateRequestDto {
  templateId: string
}
