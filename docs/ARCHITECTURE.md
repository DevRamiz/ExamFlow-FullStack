# General Architecture

## Top-level flow

1. The React client displays the user interface and stores only the JWT token in `localStorage`.
2. The client sends JSON requests to `/api` with `Authorization: Bearer <token>`.
3. Express authentication middleware verifies the token.
4. Role middleware permits lecturer-only or student-only operations.
5. Controllers translate HTTP requests into service calls.
6. Services enforce business rules and execute PostgreSQL queries.
7. PostgreSQL stores durable users, exams, and submissions.
8. Express returns safe JSON. Lecturer-only fields such as correct answers are removed from student exam responses.

## Client architecture

The client uses a component/page structure rather than a large single component.

```text
App
├── AuthProvider
├── ProtectedRoute
└── Layout
    ├── Role navigation
    ├── Notification banner
    └── Route page
        ├── Lecturer pages
        │   ├── Dashboard
        │   ├── Exam list
        │   ├── Exam editor
        │   ├── Submission list
        │   └── Submission review
        └── Student pages
            ├── Available exams
            ├── Take exam
            └── Results
```

Main packages:

- `react` and `react-dom`: interface rendering.
- `react-router-dom`: navigation and route protection.
- `vite`: development and production builds.

## Server architecture

The server follows a simple layered architecture:

```text
Routes -> Controllers -> Services -> PostgreSQL
               |             |
               |             +-- business rules and grading
               +-- HTTP input/output
```

Main packages:

- `express`: REST API.
- `pg`: PostgreSQL connection pool.
- `jsonwebtoken`: JWT creation and verification.
- `bcryptjs`: password hashing.
- `helmet`: safer HTTP response headers.
- `cors`: configured client access.
- `morgan`: request logs.
- `ws`: WebSocket notifications.
- `dotenv`: environment configuration.

## Security decisions

- Passwords are never stored as plain text.
- JWT secret is read from environment variables.
- Role authorization is verified on the server, not only hidden in the UI.
- Lecturer exam ownership is checked before updates, grading, deletion, and result publication.
- Students can only access their own submissions.
- Correct answers are removed from published exams before sending them to students.
- A unique database constraint prevents multiple submissions by the same student for one exam.
- Validation rejects invalid question types, scores, durations, emails, and empty values.

## Data ownership

- `users`: account identity and role.
- `exams`: lecturer-owned exam metadata and JSONB question model.
- `submissions`: student-owned attempt, JSONB answers, scores, feedback, and result publication state.
- The React client does not own persistent business data; it only renders server responses and temporary form state.
