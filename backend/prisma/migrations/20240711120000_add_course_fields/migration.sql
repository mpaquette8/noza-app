-- AlterTable
ALTER TABLE "courses" ADD COLUMN "style" TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE "courses" ADD COLUMN "duration" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "courses" ADD COLUMN "intent" TEXT NOT NULL DEFAULT 'general';
ALTER TABLE "courses" ALTER COLUMN "detailLevel" DROP NOT NULL;
ALTER TABLE "courses" ALTER COLUMN "vulgarizationLevel" DROP NOT NULL;
