-- CreateTable
CREATE TABLE "public"."AutoEvaluationCriterion" (
    "id" SERIAL NOT NULL,
    "autoEvaluationId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "AutoEvaluationCriterion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."AutoEvaluationCriterion" ADD CONSTRAINT "AutoEvaluationCriterion_autoEvaluationId_fkey" FOREIGN KEY ("autoEvaluationId") REFERENCES "public"."AutoEvaluation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
