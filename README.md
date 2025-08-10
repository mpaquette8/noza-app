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
