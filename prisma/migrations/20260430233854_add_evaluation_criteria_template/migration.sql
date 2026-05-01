-- AlterTable
ALTER TABLE "public"."AutoEvaluationCriterion" ADD COLUMN     "templateCriterionId" INTEGER;

-- AlterTable
ALTER TABLE "public"."QuestionRequestTemplate" ADD COLUMN     "evaluationTemplateId" INTEGER;

-- CreateTable
CREATE TABLE "public"."EvaluationTemplate" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" INTEGER NOT NULL,

    CONSTRAINT "EvaluationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EvaluationTemplateCriterion" (
    "id" SERIAL NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "criterionId" INTEGER NOT NULL,
    "templateId" INTEGER NOT NULL,

    CONSTRAINT "EvaluationTemplateCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EvaluationCriterion" (
    "id" SERIAL NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" INTEGER NOT NULL,

    CONSTRAINT "EvaluationCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationTemplateCriterion_templateId_criterionId_key" ON "public"."EvaluationTemplateCriterion"("templateId", "criterionId");

-- AddForeignKey
ALTER TABLE "public"."QuestionRequestTemplate" ADD CONSTRAINT "QuestionRequestTemplate_evaluationTemplateId_fkey" FOREIGN KEY ("evaluationTemplateId") REFERENCES "public"."EvaluationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EvaluationTemplate" ADD CONSTRAINT "EvaluationTemplate_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EvaluationTemplateCriterion" ADD CONSTRAINT "EvaluationTemplateCriterion_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "public"."EvaluationCriterion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EvaluationTemplateCriterion" ADD CONSTRAINT "EvaluationTemplateCriterion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."EvaluationTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EvaluationCriterion" ADD CONSTRAINT "EvaluationCriterion_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AutoEvaluationCriterion" ADD CONSTRAINT "AutoEvaluationCriterion_templateCriterionId_fkey" FOREIGN KEY ("templateCriterionId") REFERENCES "public"."EvaluationTemplateCriterion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
