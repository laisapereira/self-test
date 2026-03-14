-- DropForeignKey
ALTER TABLE "public"."QuestionRequest" DROP CONSTRAINT "QuestionRequest_templateId_fkey";

-- AlterTable
ALTER TABLE "public"."QuestionRequest" ALTER COLUMN "templateId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."QuestionRequest" ADD CONSTRAINT "QuestionRequest_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."QuestionRequestTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
