# Course API

## POST /api/courses

Creates a new course for the authenticated user.

### New fields
- `style` (string, required): presentation style. Values: `neutral`, `pedagogical`, `storytelling`.
- `duration` (string, required): course length. Values: `short`, `medium`, `long`.
- `intent` (string, required): learning intent. Values: `discover`, `learn`, `master`, `expert`.

### Deprecated fields
- `detailLevel` (number): 1 `synthesis`, 2 `detailed`, 3 `exhaustive`. Replaced by `duration`.
- `vulgarizationLevel` (number): 1 `general_public`, 2 `enlightened`, 3 `knowledgeable`, 4 `expert`. Replaced by `intent`.

### Example request

```
POST /api/courses
Content-Type: application/json

{
  "subject": "Introduction to Algebra",
  "style": "pedagogical",
  "duration": "medium",
  "intent": "learn"
}
```

### Migration guidance
- Map `detailLevel` to `duration`: 1→`short`, 2→`medium`, 3→`long`.
- Map `vulgarizationLevel` to `intent`: 1→`discover`, 2→`learn`, 3→`master`, 4→`expert`.

Legacy fields remain accepted for backward compatibility but will be removed in a future release.
