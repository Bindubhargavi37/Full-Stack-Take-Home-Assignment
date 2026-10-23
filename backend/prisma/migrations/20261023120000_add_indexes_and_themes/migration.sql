-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "theme_preference" ADD VALUE 'CORPORATE';
ALTER TYPE "theme_preference" ADD VALUE 'EMERALD';
ALTER TYPE "theme_preference" ADD VALUE 'CUPCAKE';
ALTER TYPE "theme_preference" ADD VALUE 'DRACULA';

-- CreateIndex
CREATE INDEX "idx_status_history_changed_by" ON "submission_status_history"("changed_by");

-- CreateIndex
CREATE INDEX "idx_submissions_agent_id_created_at" ON "submissions"("agent_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_submissions_created_by" ON "submissions"("created_by");

