-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'OPERATOR', 'CUSTOMER_SERVICE', 'READ_ONLY');

-- CreateEnum
CREATE TYPE "AdminUserStatus" AS ENUM ('ACTIVE', 'DISABLED', 'LOCKED');

-- CreateEnum
CREATE TYPE "GenerationJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "GenerationJobTriggerSource" AS ENUM ('SYSTEM', 'MANUAL_RETRY');

-- CreateEnum
CREATE TYPE "GenerationJobEventType" AS ENUM ('QUEUED', 'CHAPTER_STARTED', 'CHAPTER_COMPLETED', 'WARNING', 'ERROR');

-- CreateEnum
CREATE TYPE "SchoolTemplateStatus" AS ENUM ('ENABLED', 'DISABLED');

-- CreateEnum
CREATE TYPE "DegreeType" AS ENUM ('COLLEGE', 'BACHELOR', 'MASTER', 'DOCTOR');

-- CreateEnum
CREATE TYPE "TemplateRequestStatus" AS ENUM ('PENDING', 'FULFILLED', 'IGNORED');

-- CreateEnum
CREATE TYPE "ApiConfigType" AS ENUM ('PLAGIARISM', 'CITATION_CHECK');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable: extend Order with admin portal fields
ALTER TABLE "Order"
    ADD COLUMN "title" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "product_snapshot_json" JSONB,
    ADD COLUMN "product_code_snapshot" TEXT,
    ADD COLUMN "product_name_snapshot" TEXT,
    ADD COLUMN "paid_amount_fen" INTEGER,
    ADD COLUMN "latest_failure_reason" TEXT,
    ADD COLUMN "note" TEXT,
    ADD COLUMN "paid_at" TIMESTAMP(3),
    ADD COLUMN "generation_started_at" TIMESTAMP(3),
    ADD COLUMN "generation_completed_at" TIMESTAMP(3),
    ADD COLUMN "failed_at" TIMESTAMP(3);

-- AlterTable: extend Draft with funnel milestone fields
ALTER TABLE "Draft"
    ADD COLUMN "step1_completed_at" TIMESTAMP(3),
    ADD COLUMN "step2_confirmed_at" TIMESTAMP(3),
    ADD COLUMN "outline_confirmed_at" TIMESTAMP(3);

-- CreateIndex: Order indexes for admin queries
CREATE INDEX "Order_status_created_at_idx" ON "Order"("status", "created_at");
CREATE INDEX "Order_user_id_created_at_idx" ON "Order"("user_id", "created_at");

-- CreateTable: AdminUser
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL,
    "status" "AdminUserStatus" NOT NULL DEFAULT 'ACTIVE',
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");

-- CreateTable: UserRiskControl
CREATE TABLE "UserRiskControl" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "daily_generation_limit" INTEGER,
    "reason" TEXT,
    "updated_by_admin_user_id" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRiskControl_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserRiskControl_user_id_key" ON "UserRiskControl"("user_id");

ALTER TABLE "UserRiskControl" ADD CONSTRAINT "UserRiskControl_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: SchoolTemplate
CREATE TABLE "SchoolTemplate" (
    "id" TEXT NOT NULL,
    "school_name" TEXT NOT NULL,
    "school_name_normalized" TEXT NOT NULL,
    "degree_type" "DegreeType" NOT NULL,
    "template_file_path" TEXT NOT NULL,
    "citation_style" TEXT NOT NULL,
    "heading_config_json" JSONB NOT NULL,
    "page_layout_json" JSONB NOT NULL,
    "status" "SchoolTemplateStatus" NOT NULL DEFAULT 'ENABLED',
    "created_by_admin_user_id" TEXT NOT NULL,
    "updated_by_admin_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SchoolTemplate_school_name_normalized_degree_type_key" ON "SchoolTemplate"("school_name_normalized", "degree_type");

ALTER TABLE "SchoolTemplate" ADD CONSTRAINT "SchoolTemplate_created_by_admin_user_id_fkey" FOREIGN KEY ("created_by_admin_user_id") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchoolTemplate" ADD CONSTRAINT "SchoolTemplate_updated_by_admin_user_id_fkey" FOREIGN KEY ("updated_by_admin_user_id") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: TemplateRequest
CREATE TABLE "TemplateRequest" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "school_name" TEXT NOT NULL,
    "degree_type" "DegreeType" NOT NULL,
    "document_path" TEXT,
    "status" "TemplateRequestStatus" NOT NULL DEFAULT 'PENDING',
    "linked_template_id" TEXT,
    "handled_by_admin_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TemplateRequest_status_created_at_idx" ON "TemplateRequest"("status", "created_at");

ALTER TABLE "TemplateRequest" ADD CONSTRAINT "TemplateRequest_linked_template_id_fkey" FOREIGN KEY ("linked_template_id") REFERENCES "SchoolTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TemplateRequest" ADD CONSTRAINT "TemplateRequest_handled_by_admin_user_id_fkey" FOREIGN KEY ("handled_by_admin_user_id") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: GenerationJob
CREATE TABLE "GenerationJob" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "attempt_no" INTEGER NOT NULL,
    "status" "GenerationJobStatus" NOT NULL,
    "bullmq_job_id" TEXT,
    "trigger_source" "GenerationJobTriggerSource" NOT NULL DEFAULT 'SYSTEM',
    "terminal_reason" TEXT,
    "failure_message" TEXT,
    "queued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "attention_required_at" TIMESTAMP(3),
    "operator_admin_user_id" TEXT,

    CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GenerationJob_order_id_attempt_no_key" ON "GenerationJob"("order_id", "attempt_no");
CREATE INDEX "GenerationJob_status_started_at_idx" ON "GenerationJob"("status", "started_at");

ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_operator_admin_user_id_fkey" FOREIGN KEY ("operator_admin_user_id") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: GenerationJobEventLog
CREATE TABLE "GenerationJobEventLog" (
    "id" TEXT NOT NULL,
    "generation_job_id" TEXT NOT NULL,
    "chapter_no" INTEGER,
    "event_type" "GenerationJobEventType" NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GenerationJobEventLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "GenerationJobEventLog" ADD CONSTRAINT "GenerationJobEventLog_generation_job_id_fkey" FOREIGN KEY ("generation_job_id") REFERENCES "GenerationJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: ApiConfig
CREATE TABLE "ApiConfig" (
    "id" TEXT NOT NULL,
    "config_type" "ApiConfigType" NOT NULL,
    "provider_name" TEXT NOT NULL,
    "base_url" TEXT NOT NULL,
    "encrypted_secret" TEXT,
    "rate_limit_config_json" JSONB,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "config_version" INTEGER NOT NULL DEFAULT 1,
    "updated_by_admin_user_id" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApiConfig_config_type_key" ON "ApiConfig"("config_type");

ALTER TABLE "ApiConfig" ADD CONSTRAINT "ApiConfig_updated_by_admin_user_id_fkey" FOREIGN KEY ("updated_by_admin_user_id") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: OperationLog
CREATE TABLE "OperationLog" (
    "id" TEXT NOT NULL,
    "actor_admin_user_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "before_json" JSONB,
    "after_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OperationLog_created_at_action_type_idx" ON "OperationLog"("created_at", "action_type");

ALTER TABLE "OperationLog" ADD CONSTRAINT "OperationLog_actor_admin_user_id_fkey" FOREIGN KEY ("actor_admin_user_id") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: Product
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "product_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "price_fen" INTEGER NOT NULL,
    "revision_limit" INTEGER,
    "ai_rate_threshold" DECIMAL(65,30),
    "benefits_json" JSONB NOT NULL DEFAULT '{}',
    "description" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Product_product_code_key" ON "Product"("product_code");
