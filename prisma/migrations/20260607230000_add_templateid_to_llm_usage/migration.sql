-- Add templateId to LlmUsage
ALTER TABLE "LlmUsage" ADD COLUMN "templateId" INTEGER;

-- Backfill templateId for QUESTION_GENERATION: nearest QuestionRequest by createdAt
UPDATE "LlmUsage" u
SET "templateId" = (
  SELECT qr."templateId"
  FROM "QuestionRequest" qr
  WHERE qr."userId" = u."userId"
    AND qr."templateId" IS NOT NULL
  ORDER BY ABS(EXTRACT(EPOCH FROM (qr."createdAt" - u."createdAt")))
  LIMIT 1
)
WHERE u."templateId" IS NULL AND u."type" = 'QUESTION_GENERATION';

-- Backfill templateId for ANSWER_EVALUATION: nearest Answer by createdAt
UPDATE "LlmUsage" u
SET "templateId" = (
  SELECT qr."templateId"
  FROM "Answer" a
  JOIN "Question" q ON q."id" = a."questionId"
  JOIN "QuestionRequest" qr ON qr."id" = q."requestId"
  WHERE a."userId" = u."userId"
    AND qr."templateId" IS NOT NULL
  ORDER BY ABS(EXTRACT(EPOCH FROM (a."createdAt" - u."createdAt")))
  LIMIT 1
)
WHERE u."templateId" IS NULL AND u."type" = 'ANSWER_EVALUATION';

-- Backfill templateId for PERFORMANCE_SUMMARY: nearest StudentTemplateFeedbackSummary by updatedAt
UPDATE "LlmUsage" u
SET "templateId" = (
  SELECT s."templateId"
  FROM "StudentTemplateFeedbackSummary" s
  WHERE s."studentId" = u."userId"
  ORDER BY ABS(EXTRACT(EPOCH FROM (s."updatedAt" - u."createdAt")))
  LIMIT 1
)
WHERE u."templateId" IS NULL AND u."type" = 'PERFORMANCE_SUMMARY';

-- Backfill classId for records that now have templateId resolved
UPDATE "LlmUsage" u
SET "classId" = (
  SELECT c."id"
  FROM "Class" c
  JOIN "_ClassToQuestionRequestTemplate" ct ON ct."A" = c."id"
  WHERE ct."B" = u."templateId"
    AND (
      EXISTS (SELECT 1 FROM "_ClassStudents" cs WHERE cs."A" = c."id" AND cs."B" = u."userId")
      OR c."ownerId" = u."userId"
      OR EXISTS (SELECT 1 FROM "ClassCollaborator" cc WHERE cc."classId" = c."id" AND cc."userId" = u."userId")
    )
  LIMIT 1
)
WHERE u."classId" IS NULL AND u."templateId" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "LlmUsage" ADD CONSTRAINT "LlmUsage_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "QuestionRequestTemplate"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
