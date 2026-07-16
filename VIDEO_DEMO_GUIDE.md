# Short Final Demo Script

## 1. Start and technical proof

```powershell
docker compose up --build -d
docker compose ps
docker compose logs --tail=30 server
```

Show that `db`, `server`, and `client` are healthy/running. Open `http://localhost:3000`.

## 2. Lecturer scenario

1. Sign in with `teacher@test.com / 123456`.
2. Show the lecturer dashboard statistics.
3. Create a draft exam with one multiple-choice and one open question.
4. Save it and show it in Manage Exams.
5. Publish it.
6. Mention that students receive a WebSocket notification.

## 3. Student scenario

1. Log out and sign in with `student@test.com / 123456`.
2. Open the published exam.
3. Answer questions.
4. Wait briefly and point to the automatic save message.
5. Submit the exam.
6. Show that results are hidden until the lecturer publishes them.

## 4. Grading scenario

1. Log in as the lecturer.
2. Open the exam submissions.
3. Review the student attempt.
4. Give points to the open question and write feedback.
5. Save the grade.
6. Publish results.
7. Log in as the student and show final score, correct answers, comments, and feedback.

## 5. Architecture and evidence

Briefly show:

- `README.md`.
- `docker-compose.yml`.
- `server/src/db/sql/001_schema.sql`.
- `docs/diagrams/erd.puml`.
- `docs/diagrams/system-architecture.puml`.
- Git branches and log:

```powershell
git branch -a
git log --oneline --graph --decorate --all --max-count=12
npm test
npm run build
```
