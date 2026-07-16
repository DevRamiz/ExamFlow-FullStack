import { useCallback, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useRealtimeNotifications } from "../hooks/useRealtimeNotifications.js";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notification, setNotification] = useState("");
  const handleNotification = useCallback((event) => {
    const text = event.type === "exam_published"
      ? `New exam published: ${event.title}`
      : `Results published for: ${event.title}`;
    setNotification(text);
    window.setTimeout(() => setNotification(""), 5000);
  }, []);
  useRealtimeNotifications(handleNotification);

  const links = user.role === "teacher"
    ? [["/teacher", "Dashboard"], ["/teacher/exams", "Exams"], ["/teacher/exams/new", "Create exam"]]
    : [["/student", "Available exams"], ["/student/results", "My results"]];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span>EF</span><div><strong>ExamFlow</strong><small>Exam management</small></div></div>
        <nav>
          {links.map(([to, label]) => <NavLink key={to} to={to} end={to === "/teacher" || to === "/student"}>{label}</NavLink>)}
        </nav>
        <div className="sidebar-user">
          <strong>{user.name}</strong><small>{user.role}</small>
          <button className="button button-ghost" onClick={() => { logout(); navigate("/login"); }}>Log out</button>
        </div>
      </aside>
      <main className="content">
        {notification && <div className="notification">{notification}</div>}
        <Outlet />
      </main>
    </div>
  );
}
