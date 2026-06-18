-- CreateEnum
CREATE TYPE "LlmUsageType" AS ENUM ('QUESTION_GENERATION', 'ANSWER_EVALUATION', 'PERFORMANCE_SUMMARY');

-- CreateTable
CREATE TABLE "LlmUsage" (
    "id" SERIAL NOT NULL,
    "type" "LlmUsageType" NOT NULL,
    "promptTokens" INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER,

    CONSTRAINT "LlmUsage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LlmUsage" ADD CONSTRAINT "LlmUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
