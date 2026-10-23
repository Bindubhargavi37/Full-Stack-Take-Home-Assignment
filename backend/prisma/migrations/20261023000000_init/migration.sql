-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('ADMIN', 'AGENT');

-- CreateEnum
CREATE TYPE "submission_status" AS ENUM ('NOT_FILLED_COMPLETELY', 'BILLING_PAYMENT_NOT_DONE', 'BILLING_PAYMENT_DONE', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "sample_condition" AS ENUM ('GOOD', 'OPEN', 'DAMAGED');

-- CreateEnum
CREATE TYPE "test_result" AS ENUM ('PASS', 'FAIL', 'CANNOT_BE_DECIDED');

-- CreateEnum
CREATE TYPE "theme_preference" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "full_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "user_role" NOT NULL,
    "admin_id" UUID,
    "phone" VARCHAR(15),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "theme_preference" "theme_preference" NOT NULL DEFAULT 'SYSTEM',
    "failed_login_attempts" SMALLINT NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reference_no" SERIAL NOT NULL,
    "agent_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "customer_name" VARCHAR(100),
    "location" VARCHAR(150),
    "customer_phone" VARCHAR(15),
    "customer_email" VARCHAR(254),
    "total_amount" DECIMAL(12,2),
    "amount_paid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    -- Hand-edited: Prisma cannot declare generated columns.
    "amount_due" DECIMAL(12,2) GENERATED ALWAYS AS ("total_amount" - "amount_paid") STORED,
    "sample_condition" "sample_condition",
    "result" "test_result",
    "collected_on" DATE,
    "remarks" VARCHAR(500),
    "status" "submission_status" NOT NULL DEFAULT 'NOT_FILLED_COMPLETELY',
    "rejection_reason" VARCHAR(500),
    "submitted_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "submission_id" UUID NOT NULL,
    "from_status" "submission_status",
    "to_status" "submission_status" NOT NULL,
    "changed_by" UUID NOT NULL,
    "note" VARCHAR(500),
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "user_agent" VARCHAR(255),
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_users_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_admin_id" ON "users"("admin_id");

-- CreateIndex
CREATE INDEX "idx_users_role" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "uq_submissions_reference_no" ON "submissions"("reference_no");

-- CreateIndex
CREATE INDEX "idx_submissions_agent_id_status" ON "submissions"("agent_id", "status");

-- CreateIndex
CREATE INDEX "idx_submissions_created_at" ON "submissions"("created_at");

-- CreateIndex
CREATE INDEX "idx_submissions_status" ON "submissions"("status");

-- CreateIndex
CREATE INDEX "idx_status_history_submission_id_changed_at" ON "submission_status_history"("submission_id", "changed_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_refresh_tokens_token_hash" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "idx_refresh_tokens_expires_at" ON "refresh_tokens"("expires_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "fk_users_admin_id" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "fk_submissions_agent_id" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "fk_submissions_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_status_history" ADD CONSTRAINT "fk_status_history_submission_id" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_status_history" ADD CONSTRAINT "fk_status_history_changed_by" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "fk_refresh_tokens_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Hand-written CHECK constraints (Prisma's schema language cannot express them).
-- They are the last line of defence if application validation ever misses a case.
-- ---------------------------------------------------------------------------

-- users
ALTER TABLE "users"
    ADD CONSTRAINT "chk_users_full_name_length" CHECK (char_length(btrim("full_name")) >= 2),
    ADD CONSTRAINT "chk_users_email_lowercase" CHECK ("email" = lower("email")),
    ADD CONSTRAINT "chk_users_phone_format" CHECK ("phone" IS NULL OR "phone" ~ '^\+?[0-9]{10,15}$'),
    ADD CONSTRAINT "chk_users_failed_login_attempts" CHECK ("failed_login_attempts" >= 0),
    -- Every agent has an admin; no admin has one.
    ADD CONSTRAINT "chk_users_role_admin" CHECK (
        ("role" = 'AGENT' AND "admin_id" IS NOT NULL)
        OR ("role" = 'ADMIN' AND "admin_id" IS NULL)
    );

-- submissions
ALTER TABLE "submissions"
    ADD CONSTRAINT "chk_submissions_customer_name_length" CHECK ("customer_name" IS NULL OR char_length(btrim("customer_name")) >= 2),
    ADD CONSTRAINT "chk_submissions_location_length" CHECK ("location" IS NULL OR char_length(btrim("location")) >= 2),
    ADD CONSTRAINT "chk_submissions_customer_phone_format" CHECK ("customer_phone" IS NULL OR "customer_phone" ~ '^\+?[0-9]{10,15}$'),
    ADD CONSTRAINT "chk_submissions_customer_email_lowercase" CHECK ("customer_email" IS NULL OR "customer_email" = lower("customer_email")),
    ADD CONSTRAINT "chk_submissions_total_amount_positive" CHECK ("total_amount" IS NULL OR "total_amount" > 0),
    ADD CONSTRAINT "chk_submissions_amount_paid_non_negative" CHECK ("amount_paid" >= 0),
    ADD CONSTRAINT "chk_submissions_amount_paid_lte_total" CHECK ("total_amount" IS NULL OR "amount_paid" <= "total_amount"),
    -- Required fields may be missing only while the submission is a draft.
    ADD CONSTRAINT "chk_submissions_complete_unless_draft" CHECK (
        "status" = 'NOT_FILLED_COMPLETELY'
        OR (
            "customer_name" IS NOT NULL
            AND "location" IS NOT NULL
            AND "total_amount" IS NOT NULL
            AND "sample_condition" IS NOT NULL
            AND "result" IS NOT NULL
        )
    ),
    -- Billing statuses must agree with the amounts.
    ADD CONSTRAINT "chk_submissions_payment_done" CHECK ("status" <> 'BILLING_PAYMENT_DONE' OR "total_amount" - "amount_paid" = 0),
    ADD CONSTRAINT "chk_submissions_payment_not_done" CHECK ("status" <> 'BILLING_PAYMENT_NOT_DONE' OR "total_amount" - "amount_paid" > 0),
    ADD CONSTRAINT "chk_submissions_completed_paid" CHECK ("status" <> 'COMPLETED' OR "total_amount" - "amount_paid" = 0),
    ADD CONSTRAINT "chk_submissions_rejection_reason" CHECK ("status" <> 'REJECTED' OR "rejection_reason" IS NOT NULL);

-- submission_status_history
ALTER TABLE "submission_status_history"
    ADD CONSTRAINT "chk_status_history_status_changed" CHECK ("from_status" IS DISTINCT FROM "to_status");

-- refresh_tokens
ALTER TABLE "refresh_tokens"
    ADD CONSTRAINT "chk_refresh_tokens_expiry" CHECK ("expires_at" > "created_at");
