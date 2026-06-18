/*
  Warnings:

  - You are about to drop the column `admin` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Group` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_GroupUsers` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('STUDENT', 'PROFESSOR', 'ADMIN');

-- DropForeignKey
ALTER TABLE "public"."Group" DROP CONSTRAINT "Group_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."_GroupUsers" DROP CONSTRAINT "_GroupUsers_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_GroupUsers" DROP CONSTRAINT "_GroupUsers_B_fkey";

-- Step 1: add column with default
ALTER TABLE "public"."User" ADD COLUMN "role" "public"."Role" NOT NULL DEFAULT 'STUDENT';

-- Step 2: migrate existing admins
UPDATE "public"."User" SET "role" = 'ADMIN' WHERE "admin" = true;

-- Step 3: drop old column
ALTER TABLE "public"."User" DROP COLUMN "admin";

-- DropTable
DROP TABLE "public"."Group";

-- DropTable
DROP TABLE "public"."_GroupUsers";

-- CreateTable
CREATE TABLE "public"."Class" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "link" TEXT NOT NULL,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ClassCollaborator" (
    "classId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassCollaborator_pkey" PRIMARY KEY ("classId","userId")
);

-- CreateTable
CREATE TABLE "public"."_ClassStudents" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ClassStudents_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_ClassToQuestionRequestTemplate" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ClassToQuestionRequestTemplate_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_ClassToEvaluationTemplate" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ClassToEvaluationTemplate_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Class_link_key" ON "public"."Class"("link");

-- CreateIndex
CREATE INDEX "_ClassStudents_B_index" ON "public"."_ClassStudents"("B");

-- CreateIndex
CREATE INDEX "_ClassToQuestionRequestTemplate_B_index" ON "public"."_ClassToQuestionRequestTemplate"("B");

-- CreateIndex
CREATE INDEX "_ClassToEvaluationTemplate_B_index" ON "public"."_ClassToEvaluationTemplate"("B");

-- AddForeignKey
ALTER TABLE "public"."Class" ADD CONSTRAINT "Class_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClassCollaborator" ADD CONSTRAINT "ClassCollaborator_classId_fkey" FOREIGN KEY ("classId") REFERENCES "public"."Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClassCollaborator" ADD CONSTRAINT "ClassCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ClassStudents" ADD CONSTRAINT "_ClassStudents_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ClassStudents" ADD CONSTRAINT "_ClassStudents_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ClassToQuestionRequestTemplate" ADD CONSTRAINT "_ClassToQuestionRequestTemplate_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ClassToQuestionRequestTemplate" ADD CONSTRAINT "_ClassToQuestionRequestTemplate_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."QuestionRequestTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ClassToEvaluationTemplate" ADD CONSTRAINT "_ClassToEvaluationTemplate_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ClassToEvaluationTemplate" ADD CONSTRAINT "_ClassToEvaluationTemplate_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."EvaluationTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
