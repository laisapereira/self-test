-- AlterTable
ALTER TABLE "public"."Class" ADD COLUMN     "featuredTemplateId" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."Class" ADD CONSTRAINT "Class_featuredTemplateId_fkey" FOREIGN KEY ("featuredTemplateId") REFERENCES "public"."QuestionRequestTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
