-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('BASIC');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'GENERATING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ChapterStatus" AS ENUM ('PENDING', 'GENERATING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "ReferenceSource" AS ENUM ('CNKI', 'WANFANG', 'VIPINFO', 'SEMANTIC_SCHOLAR', 'CROSSREF', 'USER_INPUT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "wechat_open_id" TEXT NOT NULL,
    "wechat_union_id" TEXT,
    "nickname" TEXT,
    "avatar_url" TEXT,
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Draft" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "current_step" INTEGER NOT NULL,
    "step1_data" JSONB NOT NULL,
    "step2_data" JSONB NOT NULL,
    "step3_data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Draft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "draft_id" TEXT NOT NULL,
    "plan_type" "PlanType" NOT NULL,
    "plan_price" INTEGER NOT NULL,
    "wechat_pay_order_id" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "generation_progress" JSONB,
    "bullmq_job_id" TEXT,
    "ai_revision_count" INTEGER NOT NULL DEFAULT 0,
    "revision_content" JSONB,
    "paper_snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedChapter" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "chapter_index" INTEGER NOT NULL,
    "chapter_title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "citation_check_result" JSONB,
    "status" "ChapterStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reference" (
    "id" TEXT NOT NULL,
    "source" "ReferenceSource" NOT NULL,
    "external_id" TEXT,
    "title" TEXT NOT NULL,
    "authors" JSONB NOT NULL,
    "journal" TEXT,
    "year" INTEGER,
    "raw_citation" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormatTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "school_keyword" JSONB NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "FormatTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_wechat_open_id_key" ON "User"("wechat_open_id");
CREATE UNIQUE INDEX "User_wechat_union_id_key" ON "User"("wechat_union_id");
CREATE UNIQUE INDEX "Draft_id_key" ON "Draft"("id");
CREATE UNIQUE INDEX "Order_draft_id_key" ON "Order"("draft_id");
CREATE UNIQUE INDEX "Reference_source_external_id_key" ON "Reference"("source", "external_id");
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "SystemConfig"("key");

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_draft_id_fkey" FOREIGN KEY ("draft_id") REFERENCES "Draft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GeneratedChapter" ADD CONSTRAINT "GeneratedChapter_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
