ALTER TABLE "users"
  DROP COLUMN "pedagogicalProfile",
  DROP COLUMN "learningGoal",
  DROP COLUMN "preferredStyle",
  ADD COLUMN "vulgarization" TEXT,
  ADD COLUMN "teacherType" TEXT,
  ADD COLUMN "duration" TEXT,
  ADD COLUMN "interests" JSONB,
  ADD COLUMN "learningContext" TEXT,
  ADD COLUMN "usageFrequency" TEXT;
