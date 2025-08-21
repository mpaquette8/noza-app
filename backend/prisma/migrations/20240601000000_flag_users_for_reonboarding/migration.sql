-- Flag users for re-onboarding if any of the new onboarding fields are missing.
-- This preserves existing accounts while ensuring they complete the updated flow.
UPDATE "users"
SET "onboardingCompleted" = false
WHERE "onboardingCompleted" = true AND (
  "vulgarization" IS NULL OR
  "teacherType" IS NULL OR
  "duration" IS NULL OR
  "interests" IS NULL OR
  "learningContext" IS NULL OR
  "usageFrequency" IS NULL
);
