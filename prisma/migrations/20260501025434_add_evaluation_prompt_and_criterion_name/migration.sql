-- AlterTable
ALTER TABLE "public"."EvaluationCriterion" ADD COLUMN     "name" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "public"."EvaluationTemplate" ADD COLUMN     "evaluationPrompt" TEXT;
