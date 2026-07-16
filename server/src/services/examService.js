import { pool } from "../db/pool.js";
import { AppError } from "../utils/AppError.js";
import { normalizeQuestions, requireInteger, requireText } from "../utils/validation.js";
import { notify } from "./notificationService.js";
import { totalExamPoints } from "./gradingService.js";

function withoutAnswers(questions) {
  return (questions || []).map(({ correctAnswer, ...question }) => question);
}

function mapExam(row, includeAnswers) {
  const questions = Array.isArray(row.questions) ? row.questions : [];
  return {
    id: row.id,
    lecturerId: row.lecturer_id,
    lecturerName: row.lecturer_name,
    title: row.title,
    description: row.description,
    durationMinutes: row.duration_minutes,
    status: row.status,
    questions: includeAnswers ? questions : withoutAnswers(questions),
    questionCount: questions.length,
    totalPoints: totalExamPoints(questions),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    submissionStatus: row.submission_status || null
  };
}

async function getOwnedExam(examId, teacherId) {
  const result = await pool.query(
    `SELECT e.*, u.name AS lecturer_name
     FROM exams e JOIN users u ON u.id = e.lecturer_id
     WHERE e.id = $1 AND e.lecturer_id = $2`,
    [examId, teacherId]
  );
  if (!result.rowCount) throw new AppError(404, "Exam was not found.");
  return result.rows[0];
}

function normalizeExamInput(payload) {
  return {
    title: requireText(payload.title, "Title", 180),
    description: typeof payload.description === "string" ? payload.description.trim().slice(0, 3000) : "",
    durationMinutes: requireInteger(payload.durationMinutes, "Duration", 1, 600),
    questions: normalizeQuestions(payload.questions)
  };
}

export async function listExams(user) {
  if (user.role === "teacher") {
    const result = await pool.query(
      `SELECT e.*, u.name AS lecturer_name,
              COUNT(s.id)::int AS submission_count,
              COUNT(s.id) FILTER (WHERE s.status = 'graded')::int AS graded_count
       FROM exams e
       JOIN users u ON u.id = e.lecturer_id
       LEFT JOIN submissions s ON s.exam_id = e.id
       WHERE e.lecturer_id = $1
       GROUP BY e.id, u.name
       ORDER BY e.updated_at DESC`,
      [user.id]
    );
    return result.rows.map((row) => ({
      ...mapExam(row, true),
      submissionCount: row.submission_count,
      gradedCount: row.graded_count
    }));
  }

  const result = await pool.query(
    `SELECT e.*, u.name AS lecturer_name, s.status AS submission_status
     FROM exams e
     JOIN users u ON u.id = e.lecturer_id
     LEFT JOIN submissions s ON s.exam_id = e.id AND s.student_id = $1
     WHERE e.status = 'published'
     ORDER BY e.published_at DESC, e.id DESC`,
    [user.id]
  );
  return result.rows.map((row) => mapExam(row, false));
}

export async function getExam(examId, user) {
  const params = [examId];
  let condition = "e.id = $1";
  if (user.role === "teacher") {
    params.push(user.id);
    condition += " AND e.lecturer_id = $2";
  } else {
    condition += " AND e.status = 'published'";
  }

  const result = await pool.query(
    `SELECT e.*, u.name AS lecturer_name
     FROM exams e JOIN users u ON u.id = e.lecturer_id
     WHERE ${condition}`,
    params
  );
  if (!result.rowCount) throw new AppError(404, "Exam was not found.");
  return mapExam(result.rows[0], user.role === "teacher");
}

export async function createExam(teacherId, payload) {
  const input = normalizeExamInput(payload);
  const result = await pool.query(
    `INSERT INTO exams (lecturer_id, title, description, duration_minutes, questions)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING *`,
    [teacherId, input.title, input.description, input.durationMinutes, JSON.stringify(input.questions)]
  );
  return mapExam(result.rows[0], true);
}

export async function updateExam(examId, teacherId, payload) {
  const existing = await getOwnedExam(examId, teacherId);
  if (existing.status !== "draft") {
    throw new AppError(409, "Only draft exams can be edited.");
  }
  const input = normalizeExamInput(payload);
  const result = await pool.query(
    `UPDATE exams
     SET title = $1, description = $2, duration_minutes = $3,
         questions = $4::jsonb, updated_at = NOW()
     WHERE id = $5 AND lecturer_id = $6
     RETURNING *`,
    [input.title, input.description, input.durationMinutes, JSON.stringify(input.questions), examId, teacherId]
  );
  return mapExam(result.rows[0], true);
}

export async function deleteExam(examId, teacherId) {
  const existing = await getOwnedExam(examId, teacherId);
  if (existing.status !== "draft") {
    throw new AppError(409, "Only draft exams can be deleted.");
  }
  await pool.query("DELETE FROM exams WHERE id = $1 AND lecturer_id = $2", [examId, teacherId]);
}

export async function publishExam(examId, teacherId) {
  const existing = await getOwnedExam(examId, teacherId);
  if (existing.status !== "draft") {
    throw new AppError(409, "Only a draft exam can be published.");
  }
  if (!Array.isArray(existing.questions) || existing.questions.length === 0) {
    throw new AppError(409, "An empty exam cannot be published.");
  }
  const result = await pool.query(
    `UPDATE exams SET status = 'published', published_at = COALESCE(published_at, NOW()), updated_at = NOW()
     WHERE id = $1 AND lecturer_id = $2 RETURNING *`,
    [examId, teacherId]
  );
  notify({ type: "exam_published", examId: Number(examId), title: result.rows[0].title, targetRole: "student" });
  return mapExam(result.rows[0], true);
}

export async function closeExam(examId, teacherId) {
  const existing = await getOwnedExam(examId, teacherId);
  if (existing.status !== "published") {
    throw new AppError(409, "Only a published exam can be closed.");
  }
  const result = await pool.query(
    `UPDATE exams SET status = 'closed', updated_at = NOW()
     WHERE id = $1 AND lecturer_id = $2 RETURNING *`,
    [examId, teacherId]
  );
  return mapExam(result.rows[0], true);
}

export async function listExamSubmissions(examId, teacherId) {
  await getOwnedExam(examId, teacherId);
  const result = await pool.query(
    `SELECT s.id, s.status, s.auto_score, s.manual_score, s.final_score,
            s.results_published, s.started_at, s.submitted_at, s.graded_at,
            u.id AS student_id, u.name AS student_name, u.email AS student_email
     FROM submissions s JOIN users u ON u.id = s.student_id
     WHERE s.exam_id = $1
     ORDER BY s.submitted_at DESC NULLS LAST, s.started_at DESC`,
    [examId]
  );
  return result.rows.map((row) => ({
    id: row.id,
    status: row.status,
    autoScore: Number(row.auto_score),
    manualScore: Number(row.manual_score),
    finalScore: row.final_score == null ? null : Number(row.final_score),
    resultsPublished: row.results_published,
    startedAt: row.started_at,
    submittedAt: row.submitted_at,
    gradedAt: row.graded_at,
    student: { id: row.student_id, name: row.student_name, email: row.student_email }
  }));
}

export async function publishResults(examId, teacherId) {
  const exam = await getOwnedExam(examId, teacherId);
  const pending = await pool.query(
    `SELECT COUNT(*)::int AS count FROM submissions
     WHERE exam_id = $1 AND status = 'submitted'`,
    [examId]
  );
  if (pending.rows[0].count > 0) {
    throw new AppError(409, "Grade all submitted exams before publishing results.");
  }
  const result = await pool.query(
    `UPDATE submissions SET results_published = TRUE, updated_at = NOW()
     WHERE exam_id = $1 AND status = 'graded' RETURNING id`,
    [examId]
  );
  notify({ type: "results_published", examId: Number(examId), title: exam.title, targetRole: "student" });
  return { publishedCount: result.rowCount };
}
