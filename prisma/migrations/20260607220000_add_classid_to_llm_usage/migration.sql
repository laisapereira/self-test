-- AlterTable: add classId to LlmUsage for per-class aggregation
ALTER TABLE "LlmUsage" ADD COLUMN "classId" INTEGER;

-- AddForeignKey
ALTER TABLE "LlmUsage" ADD CONSTRAINT "LlmUsage_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;
