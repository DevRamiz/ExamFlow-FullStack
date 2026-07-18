import { pool } from "../db/pool.js";
import { AppError } from "../utils/AppError.js";
import { applyManualGrades, gradeAutomaticQuestions, totalExamPoints } from "./gradingService.js";

function sanitizeQuestions(questions, showCorrectAnswers) {
  return (questions || []).map((question) => {
    if (showCorrectAnswers) return question;
    const { correctAnswer, ...safe } = question;
    return safe;
  });
}

function mapSubmission(row, options = {}) {
  const questions = Array.isArray(row.questions) ? row.questions : [];
  return {
    id: row.id,
    examId: row.exam_id,
    studentId: row.student_id,
    status: row.status,
    answers: Array.isArray(row.answers) ? row.answers : [],
    autoScore: options.showScore ? Number(row.auto_score) : null,
    manualScore: options.showScore ? Number(row.manual_score) : null,
    finalScore: options.showScore && row.final_score != null ? Number(row.final_score) : null,
    totalPoints: totalExamPoints(questions),
    feedback: options.showScore ? row.feedback : "",
    resultsPublished: row.results_published,
    startedAt: row.started_at,
    updatedAt: row.updated_at,
    submittedAt: row.submitted_at,
    gradedAt: row.graded_at,
    exam: {
      id: row.exam_id,
      title: row.exam_title,
      description: row.exam_description,
      durationMinutes: row.duration_minutes,
      status: row.exam_status,
      questions: sanitizeQuestions(questions, options.showCorrectAnswers)
    },
    student: row.student_name ? {
      id: row.student_id,
      name: row.student_name,
      email: row.student_email
    } : undefined
  };
}

async function loadSubmission(submissionId) {
  const result = await pool.query(
    `SELECT s.*, e.title AS exam_title, e.description AS exam_description,
            e.duration_minutes, e.status AS exam_status, e.questions, e.lecturer_id,
            u.name AS student_name, u.email AS student_email
     FROM submissions s
     JOIN exams e ON e.id = s.exam_id
     JOIN users u ON u.id = s.student_id
     WHERE s.id = $1`,
    [submissionId]
  );
  if (!result.rowCount) throw new AppError(404, "Submission was not found.");
  return result.rows[0];
}

function ensureStudentOwns(row, studentId) {
  if (row.student_id !== studentId) {
    throw new AppError(403, "You cannot access this submission.");
  }
}

export async function startSubmission(examId, studentId) {
  const examResult = await pool.query(
    "SELECT * FROM exams WHERE id = $1 AND status = 'published'",
    [examId]
  );
  if (!examResult.rowCount) throw new AppError(404, "Published exam was not found.");

  await pool.query(
    `INSERT INTO submissions (exam_id, student_id)
     VALUES ($1, $2)
     ON CONFLICT (exam_id, student_id) DO NOTHING`,
    [examId, studentId]
  );
  const result = await pool.query(
    `SELECT s.*, e.title AS exam_title, e.description AS exam_description,
            e.duration_minutes, e.status AS exam_status, e.questions
     FROM submissions s JOIN exams e ON e.id = s.exam_id
     WHERE s.exam_id = $1 AND s.student_id = $2`,
    [examId, studentId]
  );
  return mapSubmission(result.rows[0], { showScore: false, showCorrectAnswers: false });
}

export async function autosaveSubmission(submissionId, studentId, submittedAnswers) {
  const row = await loadSubmission(submissionId);
  ensureStudentOwns(row, studentId);
  if (row.status !== "in_progress") throw new AppError(409, "Only an active exam can be saved.");

  const normalized = (Array.isArray(submittedAnswers) ? submittedAnswers : []).map((answer) => ({
    questionId: String(answer.questionId),
    value: typeof answer.value === "string" ? answer.value.slice(0, 5000) : ""
  }));
  const result = await pool.query(
    `UPDATE submissions SET answers = $1::jsonb, updated_at = NOW()
     WHERE id = $2 RETURNING updated_at`,
    [JSON.stringify(normalized), submissionId]
  );
  return { updatedAt: result.rows[0].updated_at };
}

export async function submitExam(submissionId, studentId, submittedAnswers) {
  const row = await loadSubmission(submissionId);
  ensureStudentOwns(row, studentId);
  if (row.status !== "in_progress") throw new AppError(409, "This exam was already submitted.");

  const { autoScore, answers } = gradeAutomaticQuestions(row.questions, submittedAnswers);
  const hasTextQuestions = row.questions.some((question) => question.type === "text");
  const status = hasTextQuestions ? "submitted" : "graded";
  const finalScore = hasTextQuestions ? null : autoScore;

  const result = await pool.query(
    `UPDATE submissions
     SET answers = $1::jsonb, auto_score = $2, final_score = $3,
         status = $4::varchar(20), submitted_at = NOW(),
         graded_at = CASE WHEN $4::varchar(20) = 'graded' THEN NOW() ELSE NULL END,
         updated_at = NOW()
     WHERE id = $5 RETURNING *`,
    [JSON.stringify(answers), autoScore, finalScore, status, submissionId]
  );

  return { id: result.rows[0].id, status: result.rows[0].status };
}

export async function listMySubmissions(studentId) {
  const result = await pool.query(
    `SELECT s.*, e.title AS exam_title, e.description AS exam_description,
            e.duration_minutes, e.status AS exam_status, e.questions
     FROM submissions s JOIN exams e ON e.id = s.exam_id
     WHERE s.student_id = $1
     ORDER BY s.updated_at DESC`,
    [studentId]
  );
  return result.rows.map((row) => mapSubmission(row, {
    showScore: row.results_published,
    showCorrectAnswers: row.results_published
  }));
}

export async function getSubmission(submissionId, user) {
  const row = await loadSubmission(submissionId);
  if (user.role === "student") {
    ensureStudentOwns(row, user.id);
    return mapSubmission(row, {
      showScore: row.results_published,
      showCorrectAnswers: row.results_published
    });
  }
  if (row.lecturer_id !== user.id) throw new AppError(403, "You cannot access this submission.");
  return mapSubmission(row, { showScore: true, showCorrectAnswers: true });
}

export async function gradeSubmission(submissionId, teacherId, payload) {
  const row = await loadSubmission(submissionId);
  if (row.lecturer_id !== teacherId) throw new AppError(403, "You cannot grade this submission.");
  if (!["submitted", "graded"].includes(row.status)) {
    throw new AppError(409, "The student has not submitted this exam yet.");
  }

  const { manualScore, answers } = applyManualGrades(row.questions, row.answers, payload.grades);
  const finalScore = Number(row.auto_score) + manualScore;
  const feedback = typeof payload.feedback === "string" ? payload.feedback.trim().slice(0, 3000) : "";

  const result = await pool.query(
    `UPDATE submissions
     SET answers = $1::jsonb, manual_score = $2, final_score = $3,
         feedback = $4, status = 'graded', graded_at = NOW(), updated_at = NOW()
     WHERE id = $5 RETURNING *`,
    [JSON.stringify(answers), manualScore, finalScore, feedback, submissionId]
  );
  return mapSubmission({ ...row, ...result.rows[0] }, { showScore: true, showCorrectAnswers: true });
}
