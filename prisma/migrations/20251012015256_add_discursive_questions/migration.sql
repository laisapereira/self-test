-- AlterTable
ALTER TABLE "public"."Answer" ADD COLUMN     "openAnswer" TEXT,
ALTER COLUMN "answerIndex" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Question" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'multiple-choice',
ALTER COLUMN "correctAnswerIndex" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."AutoEvaluation" (
    "id" SERIAL NOT NULL,
    "answerId" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "justification" TEXT NOT NULL,
    "modelVersion" TEXT,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutoEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AutoEvaluation_answerId_key" ON "public"."AutoEvaluation"("answerId");

-- AddForeignKey
ALTER TABLE "public"."AutoEvaluation" ADD CONSTRAINT "AutoEvaluation_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "public"."Answer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
