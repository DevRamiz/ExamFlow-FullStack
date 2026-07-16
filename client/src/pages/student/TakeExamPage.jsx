import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../../api/http.js";

export default function TakeExamPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [answers, setAnswers] = useState({});
  const [saveStatus, setSaveStatus] = useState("");
  const [error, setError] = useState("");
  const answersRef = useRef(answers);
  answersRef.current = answers;

  useEffect(() => {
    apiRequest(`/exams/${examId}/start`, { method: "POST" })
      .then(({ submission: data }) => {
        setSubmission(data);
        const initial = {};
        for (const answer of data.answers || []) initial[answer.questionId] = answer.value;
        setAnswers(initial);
      })
      .catch((err) => setError(err.message));
  }, [examId]);

  useEffect(() => {
    if (!submission || submission.status !== "in_progress") return undefined;
    const timer = window.setInterval(async () => {
      try {
        setSaveStatus("Saving...");
        await apiRequest(`/submissions/${submission.id}/autosave`, {
          method: "PATCH",
          body: JSON.stringify({ answers: toAnswerArray(answersRef.current) })
        });
        setSaveStatus(`Saved at ${new Date().toLocaleTimeString()}`);
      } catch {
        setSaveStatus("Auto-save failed");
      }
    }, 10000);
    return () => window.clearInterval(timer);
  }, [submission]);

  function toAnswerArray(values) {
    return Object.entries(values).map(([questionId, value]) => ({ questionId, value }));
  }

  const answeredCount = useMemo(() => Object.values(answers).filter((value) => String(value || "").trim()).length, [answers]);

  async function saveAndLeave() {
    try {
      await apiRequest(`/submissions/${submission.id}/autosave`, {
        method: "PATCH",
        body: JSON.stringify({ answers: toAnswerArray(answers) })
      });
      navigate("/student");
    } catch (err) { setError(err.message); }
  }

  async function submitExam() {
    if (!confirm("Submit the exam? You cannot change the answers afterwards.")) return;
    try {
      await apiRequest(`/submissions/${submission.id}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers: toAnswerArray(answers) })
      });
      navigate("/student/results");
    } catch (err) { setError(err.message); }
  }

  if (error && !submission) return <div className="alert alert-error">{error}</div>;
  if (!submission) return <div className="card">Loading exam...</div>;
  if (submission.status !== "in_progress") {
    return <div className="card empty-state"><h2>This attempt is already {submission.status.replaceAll("_", " ")}.</h2><p>Open My Results to check its current state.</p><button className="button button-primary" onClick={() => navigate("/student/results")}>My results</button></div>;
  }

  return (
    <div>
      <header className="page-header exam-header"><div><p className="eyebrow">Active exam</p><h1>{submission.exam.title}</h1><p>{submission.exam.description}</p></div><div className="exam-progress"><strong>{answeredCount}/{submission.exam.questions.length}</strong><span>answered</span><small>{saveStatus || "Auto-save every 10 seconds"}</small></div></header>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="form-stack">
        {submission.exam.questions.map((question, index) => (
          <section className="card exam-question" key={question.id}>
            <div className="question-header"><strong>{index + 1}. {question.text}</strong><span>{question.points} points</span></div>
            {question.type === "multiple_choice" ? (
              <div className="answer-options">
                {question.options.map((option) => <label key={option} className={`answer-option ${answers[question.id] === option ? "selected" : ""}`}><input type="radio" name={question.id} value={option} checked={answers[question.id] === option} onChange={() => setAnswers({ ...answers, [question.id]: option })} /><span>{option}</span></label>)}
              </div>
            ) : (
              <textarea rows="6" placeholder="Write your answer..." value={answers[question.id] || ""} onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })} />
            )}
          </section>
        ))}
        <div className="sticky-actions"><button className="button button-secondary" onClick={saveAndLeave}>Save and leave</button><button className="button button-primary" onClick={submitExam}>Submit exam</button></div>
      </div>
    </div>
  );
}
