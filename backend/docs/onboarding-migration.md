# Onboarding Migration

To harmonize onboarding fields, existing columns (`pedagogicalProfile`, `learningGoal`, `preferredStyle`) were removed in favor of new ones (`vulgarization`, `teacherType`, `duration`, `interests`, `learningContext`, `usageFrequency`).

Because the old data could not be safely mapped to the new structure, we preserve user accounts and course data while requiring users to go through onboarding again. The migration script [`20240601000000_flag_users_for_reonboarding`](../prisma/migrations/20240601000000_flag_users_for_reonboarding/migration.sql) marks any user who lacks a value for one of the new fields as needing onboarding by setting `onboardingCompleted` to `false`.

This approach keeps existing production data intact and avoids silent loss of information. Users will be prompted to re-onboard and provide the new profile information.
