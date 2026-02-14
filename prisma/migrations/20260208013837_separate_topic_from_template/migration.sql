/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Topic` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `ownerId` to the `Topic` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."QuestionRequest" DROP CONSTRAINT "QuestionRequest_templateId_fkey";

-- AlterTable
ALTER TABLE "public"."QuestionRequest" ADD COLUMN     "generatedPrompt" TEXT,
ADD COLUMN     "questionType" TEXT NOT NULL DEFAULT 'multiple-choice',
ADD COLUMN     "topicId" INTEGER,
ALTER COLUMN "templateId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Topic" ADD COLUMN     "evaluationCriteria" JSONB,
ADD COLUMN     "ownerId" INTEGER NOT NULL,
ADD COLUMN     "parameters" JSONB[];

-- CreateTable
CREATE TABLE "public"."PromptTemplate" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "promptTemplate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Topic_name_key" ON "public"."Topic"("name");

-- AddForeignKey
ALTER TABLE "public"."Topic" ADD CONSTRAINT "Topic_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionRequest" ADD CONSTRAINT "QuestionRequest_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "public"."Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionRequest" ADD CONSTRAINT "QuestionRequest_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."QuestionRequestTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
