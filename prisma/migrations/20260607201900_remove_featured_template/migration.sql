-- AlterTable: remove featuredTemplateId from Class (feature was removed from the application)
ALTER TABLE "Class" DROP COLUMN IF EXISTS "featuredTemplateId";
