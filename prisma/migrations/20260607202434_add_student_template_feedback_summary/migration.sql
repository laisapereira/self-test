-- CreateTable
CREATE TABLE "public"."StudentTemplateFeedbackSummary" (
    "id" SERIAL NOT NULL,
    "summary" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "studentId" INTEGER NOT NULL,
    "templateId" INTEGER NOT NULL,

    CONSTRAINT "StudentTemplateFeedbackSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentTemplateFeedbackSummary_studentId_templateId_key" ON "public"."StudentTemplateFeedbackSummary"("studentId", "templateId");

-- AddForeignKey
ALTER TABLE "public"."StudentTemplateFeedbackSummary" ADD CONSTRAINT "StudentTemplateFeedbackSummary_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentTemplateFeedbackSummary" ADD CONSTRAINT "StudentTemplateFeedbackSummary_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."QuestionRequestTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
