import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../../api/http.js";

function newQuestion(type = "multiple_choice") {
  return {
    id: crypto.randomUUID(),
    type,
    text: "",
    points: 10,
    options: type === "multiple_choice" ? ["", ""] : undefined,
    correctAnswer: type === "multiple_choice" ? "" : undefined
  };
}

export default function ExamEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const [form, setForm] = useState({ title: "", description: "", durationMinutes: 45, questions: [newQuestion()] });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editing) return;
    apiRequest(`/exams/${id}`)
      .then(({ exam }) => setForm({
        title: exam.title,
        description: exam.description,
        durationMinutes: exam.durationMinutes,
        questions: exam.questions
      }))
      .catch((err) => setError(err.message));
  }, [editing, id]);

  const totalPoints = useMemo(() => form.questions.reduce((sum, question) => sum + Number(question.points || 0), 0), [form.questions]);

  function updateQuestion(index, patch) {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question, i) => i === index ? { ...question, ...patch } : question)
    }));
  }

  function changeType(index, type) {
    updateQuestion(index, type === "multiple_choice"
      ? { type, options: ["", ""], correctAnswer: "" }
      : { type, options: undefined, correctAnswer: undefined });
  }

  function updateOption(questionIndex, optionIndex, value) {
    const question = form.questions[questionIndex];
    const options = question.options.map((option, i) => i === optionIndex ? value : option);
    const correctAnswer = question.correctAnswer && question.correctAnswer === question.options[optionIndex] ? value : question.correctAnswer;
    updateQuestion(questionIndex, { options, correctAnswer });
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      await apiRequest(editing ? `/exams/${id}` : "/exams", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(form)
      });
      navigate("/teacher/exams");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <header className="page-header"><div><p className="eyebrow">Exam builder</p><h1>{editing ? "Edit exam" : "Create exam"}</h1><p>Keep the questions clear and assign points to each one.</p></div><div className="score-pill">Total: {totalPoints} points</div></header>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={save} className="form-stack">
        <section className="card form-grid">
          <label>Exam title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
          <label>Duration (minutes)<input type="number" min="1" max="600" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} required /></label>
          <label className="span-2">Description<textarea rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        </section>

        <div className="section-heading"><h2>Questions</h2><button type="button" className="button button-secondary" onClick={() => setForm({ ...form, questions: [...form.questions, newQuestion()] })}>Add question</button></div>

        {form.questions.map((question, index) => (
          <section className="card question-editor" key={question.id}>
            <div className="question-header"><strong>Question {index + 1}</strong><button type="button" className="text-button danger-text" disabled={form.questions.length === 1} onClick={() => setForm({ ...form, questions: form.questions.filter((_, i) => i !== index) })}>Remove</button></div>
            <div className="form-grid">
              <label>Type<select value={question.type} onChange={(e) => changeType(index, e.target.value)}><option value="multiple_choice">Multiple choice</option><option value="text">Open text</option></select></label>
              <label>Points<input type="number" min="1" value={question.points} onChange={(e) => updateQuestion(index, { points: Number(e.target.value) })} /></label>
              <label className="span-2">Question text<textarea rows="2" value={question.text} onChange={(e) => updateQuestion(index, { text: e.target.value })} required /></label>
            </div>
            {question.type === "multiple_choice" && (
              <div className="options-editor">
                <p className="field-title">Answer options</p>
                {question.options.map((option, optionIndex) => (
                  <div className="option-edit-row" key={optionIndex}>
                    <input type="radio" name={`correct-${question.id}`} checked={question.correctAnswer === option && Boolean(option)} onChange={() => updateQuestion(index, { correctAnswer: option })} aria-label="Mark as correct" />
                    <input value={option} onChange={(e) => updateOption(index, optionIndex, e.target.value)} placeholder={`Option ${optionIndex + 1}`} required />
                    <button type="button" className="text-button" disabled={question.options.length <= 2} onClick={() => {
                      const removed = question.options[optionIndex];
                      updateQuestion(index, {
                        options: question.options.filter((_, i) => i !== optionIndex),
                        correctAnswer: question.correctAnswer === removed ? "" : question.correctAnswer
                      });
                    }}>Remove</button>
                  </div>
                ))}
                <button type="button" className="text-button" onClick={() => updateQuestion(index, { options: [...question.options, ""] })}>+ Add option</button>
                <p className="help-text">Select the radio button next to the correct option.</p>
              </div>
            )}
          </section>
        ))}

        <div className="sticky-actions"><button type="button" className="button button-secondary" onClick={() => navigate("/teacher/exams")}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? "Saving..." : "Save draft"}</button></div>
      </form>
    </div>
  );
}
