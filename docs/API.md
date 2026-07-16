# REST API

All protected endpoints require:

```http
Authorization: Bearer <JWT>
Content-Type: application/json
```

## Authentication

### `POST /api/auth/register`

Creates a student account.

```json
{ "name": "Student Name", "email": "student@example.com", "password": "123456" }
```

### `POST /api/auth/login`

```json
{ "email": "teacher@test.com", "password": "123456" }
```

Returns a JWT and public user object.

### `GET /api/auth/me`

Returns the authenticated user.

## Exams

`GET /api/exams` is role-aware. Lecturers receive their drafts and published exams with correct answers. Students receive only published exams without correct answers.

`POST /api/exams` and `PUT /api/exams/:id` accept:

```json
{
  "title": "Web Fundamentals",
  "description": "Final exam",
  "durationMinutes": 45,
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "text": "What is JSONB?",
      "options": ["A PostgreSQL JSON format", "A CSS property"],
      "correctAnswer": "A PostgreSQL JSON format",
      "points": 20
    },
    {
      "id": "q2",
      "type": "text",
      "text": "Explain server-side validation.",
      "points": 30
    }
  ]
}
```

Only draft exams can be edited or deleted. Only draft exams can be published. Only published exams can be closed.

## Submissions

### `POST /api/exams/:examId/start`

Creates one in-progress submission or returns the existing attempt.

### `PATCH /api/submissions/:id/autosave`

```json
{
  "answers": [
    { "questionId": "q1", "value": "A PostgreSQL JSON format" },
    { "questionId": "q2", "value": "Validation protects the API..." }
  ]
}
```

### `POST /api/submissions/:id/submit`

Uses the same answer body. Multiple-choice points are calculated immediately. If the exam contains open questions, the submission waits for manual grading.

### `PATCH /api/submissions/:id/grade`

Lecturer-only request:

```json
{
  "feedback": "Good work. Add more detail next time.",
  "grades": [
    { "questionId": "q2", "points": 25, "comment": "Correct explanation." }
  ]
}
```

### `PATCH /api/exams/:id/results/publish`

Publishes all graded results for the exam. It refuses to publish while submitted attempts still require grading.
