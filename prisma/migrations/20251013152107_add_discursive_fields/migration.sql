-- AlterTable
ALTER TABLE "public"."Question" ADD COLUMN     "evaluationCriteria" JSONB[],
ADD COLUMN     "referenceAnswer" TEXT;
