# Database and JSON Models

## Relational model

### users

- `id`: primary key.
- `name`, `email`, `password_hash`.
- `role`: `teacher` or `student`.

### exams

- `id`: primary key.
- `lecturer_id`: foreign key to users.
- `title`, `description`, `duration_minutes`, `status`.
- `questions`: JSONB array.
- timestamps.

### submissions

- `id`: primary key.
- `exam_id`, `student_id`: foreign keys.
- `status`, scores, feedback, result visibility.
- `answers`: JSONB array.
- timestamps.
- unique pair: `(exam_id, student_id)`.

## Question JSONB model

```json
{
  "id": "q1",
  "type": "multiple_choice",
  "text": "Which HTTP method creates a resource?",
  "options": ["GET", "POST", "DELETE"],
  "correctAnswer": "POST",
  "points": 25
}
```

Open question:

```json
{
  "id": "q2",
  "type": "text",
  "text": "Explain API validation.",
  "points": 25
}
```

## Answer JSONB model

```json
{
  "questionId": "q2",
  "value": "The server validates input before database access.",
  "automaticPoints": 0,
  "manualPoints": 22,
  "teacherComment": "Good explanation."
}
```

JSONB is used because question and answer structures vary by question type. Relational columns are used for searchable identity, ownership, status, scores, and timestamps.
