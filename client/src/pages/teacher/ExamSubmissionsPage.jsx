import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../../api/http.js";
import EmptyState from "../../components/EmptyState.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";

export default function ExamSubmissionsPage() {
  const { id } = useParams();
  const [exam, setExam] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const [examData, submissionData] = await Promise.all([
        apiRequest(`/exams/${id}`),
        apiRequest(`/exams/${id}/submissions`)
      ]);
      setExam(examData.exam);
      setSubmissions(submissionData.submissions);
    } catch (err) { setError(err.message); }
  }
  useEffect(() => { load(); }, [id]);

  async function publishResults() {
    setError(""); setMessage("");
    try {
      const result = await apiRequest(`/exams/${id}/results/publish`, { method: "PATCH" });
      setMessage(`Results published for ${result.publishedCount} graded submission(s).`);
      await load();
    } catch (err) { setError(err.message); }
  }

  return (
    <div>
      <header className="page-header"><div><p className="eyebrow">Submission review</p><h1>{exam?.title || "Exam submissions"}</h1><p>Review submitted answers and publish final results.</p></div><button className="button button-primary" onClick={publishResults}>Publish graded results</button></header>
      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}
      {!submissions.length ? <EmptyState title="No submissions yet" text="Student submissions will appear here." /> : (
        <div className="table-card">
          <table><thead><tr><th>Student</th><th>Status</th><th>Submitted</th><th>Score</th><th>Results</th><th></th></tr></thead>
            <tbody>{submissions.map((submission) => (
              <tr key={submission.id}>
                <td><strong>{submission.student.name}</strong><small>{submission.student.email}</small></td>
                <td><StatusBadge status={submission.status} /></td>
                <td>{submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : "Not submitted"}</td>
                <td>{submission.finalScore ?? "—"}</td>
                <td>{submission.resultsPublished ? "Published" : "Hidden"}</td>
                <td><Link className="button button-small button-secondary" to={`/teacher/submissions/${submission.id}`}>Review</Link></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
