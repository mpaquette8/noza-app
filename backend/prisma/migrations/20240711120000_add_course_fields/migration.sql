-- AlterTable
ALTER TABLE "courses" ADD COLUMN "style" TEXT NOT NULL;
ALTER TABLE "courses" ADD COLUMN "duration" INTEGER NOT NULL;
ALTER TABLE "courses" ADD COLUMN "intent" TEXT NOT NULL;
ALTER TABLE "courses" ALTER COLUMN "detailLevel" DROP NOT NULL;
ALTER TABLE "courses" ALTER COLUMN "vulgarizationLevel" DROP NOT NULL;
