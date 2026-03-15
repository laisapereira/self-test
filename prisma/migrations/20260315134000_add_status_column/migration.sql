-- CreateEnum
CREATE TYPE "public"."QuestionRequestStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELED', 'FAILED');

-- AlterTable
ALTER TABLE "public"."QuestionRequest" ADD COLUMN "status" "public"."QuestionRequestStatus" NOT NULL DEFAULT 'PENDING';
