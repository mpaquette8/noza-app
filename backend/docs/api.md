# Course API

## GET /api/courses

Returns the authenticated user's courses ordered from newest to oldest.

### Query parameters
- `page` (integer, optional): page number, default `1`.
- `limit` (integer, optional): number of courses per page, default `10`, max `50`.

### Example
```
GET /api/courses?page=2&limit=10
Authorization: Bearer <token>
```

## POST /api/courses

Creates a new course for the authenticated user.

### New fields
- `vulgarization` (string, required): audience level. Values: `general_public`, `enlightened`, `knowledgeable`, `expert`.
- `duration` (string, required): course length. Values: `short`, `medium`, `long`.
- `teacher_type` (string, required): teacher persona. Values: `methodical`, `passionate`, `analogist`, `pragmatic`, `benevolent`, `synthetic`.

### Deprecated fields
- `detailLevel` (number): 1 `synthesis`, 2 `detailed`, 3 `exhaustive`. Replaced by `duration`.
- `vulgarizationLevel` (number): 1 `general_public`, 2 `enlightened`, 3 `knowledgeable`, 4 `expert`. Replaced by `vulgarization`.
- `style` (string): presentation style, replaced by `vulgarization`.
- `intent` (string): learning intent, replaced by `teacher_type`.

### Example request

```
POST /api/courses
Content-Type: application/json

{
  "subject": "Introduction to Algebra",
  "vulgarization": "enlightened",
  "duration": "medium",
  "teacher_type": "methodical"
}
```

### Migration guidance
- Map `detailLevel` to `duration`: 1→`short`, 2→`medium`, 3→`long`.
- Map `vulgarizationLevel` to `vulgarization`: 1→`general_public`, 2→`enlightened`, 3→`knowledgeable`, 4→`expert`.

Legacy fields remain accepted for backward compatibility but will be removed in a future release.
