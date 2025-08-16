# Noza App

## Course Creation Parameters

The `POST /api/courses` endpoint now supports the following parameters:

- `subject` (string, required): topic to generate a course about.
- `style` (string, required): presentation style. Accepted values: `neutral`, `pedagogical`, `storytelling`.
- `duration` (string, required): estimated course length. Accepted values: `short`, `medium`, `long`.
- `intent` (string, required): learning intention. Accepted values: `discover`, `learn`, `master`, `expert`.
- `detailLevel` (number, deprecated): legacy field mapped to `duration`.
- `vulgarizationLevel` (number, deprecated): legacy field mapped to `intent`.

### Sample payload

```json
{
  "subject": "Introduction to Algebra",
  "style": "pedagogical",
  "duration": "medium",
  "intent": "learn"
}
```

Legacy clients may continue to send `detailLevel` and `vulgarizationLevel`. These fields remain supported for backward compatibility but will be removed in a future release.

## Running the Server

`npm start` launches the backend with `NODE_ENV` defaulting to `development`, which runs the API over plain HTTP and does not require TLS certificates.

For production deployments you must:

- set `NODE_ENV=production`
- provide paths to your TLS files via `TLS_CERT_PATH` and `TLS_KEY_PATH`

With these variables defined the server starts in HTTPS mode. Without them the start script keeps the server in HTTP mode, suitable for local development or environments without TLS.

## Analytics Events

The frontend onboarding sequence sends Google Analytics events to track user progress:

- `onboarding_step_enter`
  - `step` (number): 1-based step index when a step is displayed.
- `onboarding_step_exit`
  - `step` (number): step index that was exited.
  - `action` (string): reason for leaving the step. Values include `next`, `prev`, `skip`, `complete`, and `abandon`.
- `onboarding_tutorial_skip`
  - `step` (number): step where the user abandoned the entire tutorial.
