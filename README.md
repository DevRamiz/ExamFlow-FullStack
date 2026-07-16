# ExamFlow — Full-Stack Exam Management System

ExamFlow is a complete exam-management application for lecturers and students. It replaces the earlier mock-data React project with a real Node.js API, PostgreSQL persistence, JWT authentication, role authorization, Docker, automated grading, manual grading, auto-save, analytics, and real-time notifications.

## Submission links

- GitHub repository: `https://github.com/DevRamiz/ExamApp`
- Development branch: `dev`
- Production deploy: add the Render URL after deployment
- Local Docker URL: `http://localhost:3000`
- Local API health check: `http://localhost:4000/api/health`

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Lecturer | `teacher@test.com` | `123456` |
| Student | `student@test.com` | `123456` |
| Student | `student2@test.com` | `123456` |

## Main features

### Lecturer

- Secure login with a lecturer role.
- Dashboard with exam, publication, submission, grading, and average-score statistics.
- Create draft exams.
- Add, edit, and remove multiple-choice or open-text questions.
- Assign points and duration.
- Publish and close exams.
- Review student submissions.
- Automatic grading for multiple-choice questions.
- Manual grading and per-question comments for open questions.
- Overall feedback.
- Publish results to students.

### Student

- Register and log in.
- View published exams.
- Start or continue an exam.
- Answer multiple-choice and open-text questions.
- Automatic answer saving every 10 seconds.
- Submit once.
- View submission status.
- View grades, correct answers, comments, and feedback only after results are published.

### Additional technical features

- PostgreSQL hybrid model using normal columns plus `JSONB` questions and answers.
- JWT authentication and server-side role authorization.
- Password hashing with bcrypt.
- WebSocket real-time notifications when exams or results are published.
- Docker Compose for client, API, and PostgreSQL.
- Single-image Docker deployment for a cloud service.
- Health checks, request logs, validation, centralized error handling, and unit tests.
- Responsive interface for desktop and mobile.

## Architecture

```text
Browser / React Client
        |
        | HTTPS / JSON + JWT
        | WebSocket notifications
        v
Node.js / Express API
        |
        +-- Auth module
        +-- Exams module
        +-- Submissions and grading module
        +-- Dashboard module
        |
        v
PostgreSQL
  - users: relational columns
  - exams: metadata + questions JSONB
  - submissions: relational metadata + answers JSONB
```

The client never connects directly to the database. It sends authenticated requests to the API. The API validates the request, verifies the user's role, executes PostgreSQL queries, and returns safe JSON. Correct answers are removed before an exam is sent to a student.

Detailed architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## Project structure

```text
ExamFlow_FullStack_Final/
├── client/                 React + Vite frontend
│   ├── src/api/            HTTP client
│   ├── src/components/     Shared UI and route protection
│   ├── src/context/        Authentication state
│   ├── src/hooks/          WebSocket notifications
│   └── src/pages/          Lecturer and student pages
├── server/                 Node.js + Express backend
│   └── src/
│       ├── controllers/    HTTP request/response layer
│       ├── services/       Business rules
│       ├── routes/         API routing
│       ├── middleware/     Auth, roles, errors
│       ├── db/             PostgreSQL pool, migration and seed
│       └── tests/          Unit tests
├── docs/                   API, diagrams, deployment and demo guides
├── docker-compose.yml      Local multi-container environment
├── Dockerfile              Single cloud-deployment image
└── render.yaml             Render deployment blueprint
```

## Quick start with Docker

Prerequisite: Docker Desktop must be running.

```powershell
Copy-Item .env.example .env
docker compose up --build -d
docker compose ps
```

Open:

```text
http://localhost:3000
```

View logs:

```powershell
docker compose logs -f
```

Stop the project:

```powershell
docker compose down
```

Reset all database data and rerun the seed:

```powershell
docker compose down -v
docker compose up --build -d
```

## Local development

Start only PostgreSQL in Docker:

```powershell
Copy-Item .env.example .env
docker compose up -d db
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Local addresses:

- React: `http://localhost:5173`
- API: `http://localhost:4000`
- Health: `http://localhost:4000/api/health`

## Tests and production build

```powershell
npm test
npm run build
```

The unit tests cover automatic grading, manual grading limits, total points, email normalization, and question validation.

## Main API endpoints

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Exams

- `GET /api/exams`
- `GET /api/exams/:id`
- `POST /api/exams`
- `PUT /api/exams/:id`
- `DELETE /api/exams/:id`
- `PATCH /api/exams/:id/publish`
- `PATCH /api/exams/:id/close`
- `GET /api/exams/:id/submissions`
- `PATCH /api/exams/:id/results/publish`

### Submissions

- `POST /api/exams/:examId/start`
- `PATCH /api/submissions/:id/autosave`
- `POST /api/submissions/:id/submit`
- `GET /api/submissions/my`
- `GET /api/submissions/:id`
- `PATCH /api/submissions/:id/grade`

Full API documentation: [`docs/API.md`](docs/API.md)

## Database model

- `users` stores account and role data.
- `exams` stores relational metadata and a `questions JSONB` array.
- `submissions` stores submission metadata and an `answers JSONB` array.
- A lecturer owns many exams.
- An exam has many submissions.
- A student has at most one submission per exam.

See [`docs/diagrams/erd.puml`](docs/diagrams/erd.puml) and [`docs/DATABASE_MODELS.md`](docs/DATABASE_MODELS.md).

## Git milestones

The included repository history is organized into clean milestones:

1. Project foundation and configuration.
2. PostgreSQL and JSONB database.
3. JWT authentication and exam API.
4. Submissions and grading.
5. React lecturer/student interface.
6. Docker, WebSocket, tests, deployment, and documentation.

Suggested long-lived branches:

```text
main
└── dev
    ├── feature/database-jsonb
    ├── feature/auth-exams-api
    ├── feature/submissions-grading
    ├── feature/react-client
    └── feature/docker-realtime-deploy
```

Commands for uploading: [`GITHUB_SUBMISSION.md`](GITHUB_SUBMISSION.md)

## Deployment

The root `Dockerfile` builds the React client and serves it through the Express production server, so a cloud deployment needs only one web service plus PostgreSQL. `render.yaml` is included for a Render Blueprint deployment.

Deployment instructions: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

## Diagrams and documentation

- Overall architecture: `docs/diagrams/system-architecture.puml`
- Client components: `docs/diagrams/client-components.puml`
- Database ERD: `docs/diagrams/erd.puml`
- OOP/class diagram: `docs/diagrams/class-diagram.puml`
- Create/publish exam sequence: `docs/diagrams/sequence-create-exam.puml`
- Submit exam sequence: `docs/diagrams/sequence-submit-exam.puml`
- Grade/publish result sequence: `docs/diagrams/sequence-grade-results.puml`
- Video/demo checklist: `VIDEO_DEMO_GUIDE.md`
- Final submission checklist: `SUBMISSION_CHECKLIST.md`
