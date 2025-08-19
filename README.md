# Noza App

## Course Creation Parameters

The `POST /api/courses` endpoint now supports the following parameters:

- `subject` (string, required): topic to generate a course about.
- `vulgarization` (string, required): target audience. Accepted values: `general_public`, `enlightened`, `knowledgeable`, `expert`.
- `duration` (string, required): estimated course length. Accepted values: `short`, `medium`, `long`.
- `teacher_type` (string, required): teaching persona. Accepted values: `methodical`, `passionate`, `analogist`, `pragmatic`, `benevolent`, `synthetic`.
- `detailLevel` (number, deprecated): legacy field mapped to `duration`.
- `vulgarizationLevel` (number, deprecated): legacy field mapped to `vulgarization`.
- `style` (string, deprecated): maps to `vulgarization`.
- `intent` (string, deprecated): maps to `teacher_type`.

### Sample request

```json
{
  "subject": "Introduction to Algebra",
  "vulgarization": "enlightened",
  "duration": "medium",
  "teacher_type": "methodical"
}
```

### Sample response

```json
{
  "success": true,
  "course": {
    "id": "course-id",
    "subject": "Introduction to Algebra",
    "detailLevel": 2,
    "vulgarizationLevel": 2,
    "vulgarization": "enlightened",
    "duration": "medium",
    "teacherType": "methodical",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

Legacy clients may continue to send `detailLevel`, `vulgarizationLevel`, `style`, and `intent`. These fields are mapped to `duration`, `vulgarization`, `vulgarization`, and `teacher_type` respectively for backward compatibility but will be removed in a future release.

## Running the Server

`npm start` launches the backend with `NODE_ENV` defaulting to `development`, which runs the API over plain HTTP and does not require TLS certificates.

For production deployments you must:

- set `NODE_ENV=production`
- provide paths to your TLS files via `TLS_CERT_PATH` and `TLS_KEY_PATH`

With these variables defined the server starts in HTTPS mode. Without them the start script keeps the server in HTTP mode, suitable for local development or environments without TLS.
