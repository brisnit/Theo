import { BarChart3, CalendarDays, ExternalLink, LayoutDashboard, MessageSquare, Repeat, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { TERM } from '../data/calendar';
import { getCourse, getProfessor, getStudent, professorCourses, studentEnrollments } from '../data/insights';
import { DEMO_PROFESSOR, DEMO_STUDENT } from '../data/mock';
import type { Role } from '../data/types';
import type { AssistantContext } from '../lib/assistant';
import { Link } from '../lib/router';
import { useApp } from '../state/AppState';
import { Assistant } from './Assistant';
import { ChatPanel } from './Chat';
import { ErrorBoundary } from './ErrorBoundary';
import { ReviewModal } from './ReviewModal';
import { Avatar, CanvasSync, Wordmark } from './ui';

export function Shell({ role, path, ctx, children }: { role: Role; path: string; ctx: AssistantContext; children: ReactNode }) {
  const { density } = useApp();
  return (
    <div className="app" data-density={density[role]}>
      <Sidebar role={role} path={path} />
      <div className="main-col">
        <Topbar role={role} />
        <main className="main">
          <ErrorBoundary resetKey={path} fallback={<ViewUnavailable role={role} />}>{children}</ErrorBoundary>
        </main>
      </div>
      <ErrorBoundary resetKey={path} fallback={null}>
        <ChatPanel />
        <Assistant role={role} ctx={ctx} />
        <ReviewModal />
      </ErrorBoundary>
      <Toasts />
    </div>
  );
}

export function ViewUnavailable({ role }: { role: Role }) {
  return (
    <div className="page empty-page">
      <h1>This view could not be loaded</h1>
      <p className="muted">Something about this page didn't resolve. Your dashboard is still available.</p>
      <Link to={`/${role}`} className="btn btn-dark">Back to Dashboard</Link>
    </div>
  );
}

function Sidebar({ role, path }: { role: Role; path: string }) {
  const { threads, toast } = useApp();
  const base = `/${role}`;
  const unread = threads
    .filter((t) => (role === 'professor' ? t.professorId === DEMO_PROFESSOR : t.studentId === DEMO_STUDENT))
    .reduce((s, t) => s + t.unread[role], 0);

  const nav = role === 'professor'
    ? [
      { to: base, label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { to: `${base}/students`, label: 'Students', icon: Users },
      { to: `${base}/messages`, label: 'Messages', icon: MessageSquare, badge: unread },
      { to: `${base}/impact`, label: 'Impact', icon: BarChart3 },
    ]
    : [
      { to: base, label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { to: `${base}/messages`, label: 'Messages', icon: MessageSquare, badge: unread },
    ];

  const courseLinks = role === 'professor'
    ? professorCourses(DEMO_PROFESSOR).map((c) => ({ id: c.id, code: c.code, title: c.title, color: c.color }))
    : studentEnrollments(DEMO_STUDENT).map((e) => getCourse(e.courseId)!).map((c) => ({ id: c.id, code: c.code, title: c.title, color: c.color }));

  const isActive = (to: string, exact?: boolean) => (exact ? path === to || path === `${to}/` : path.startsWith(to));

  return (
    <aside className="sidebar">
      <Link to="/" className="sidebar-brand"><Wordmark /></Link>
      <div className="sidebar-role">{role === 'professor' ? 'Professor Portal' : 'Student Portal'}</div>
      <nav className="sidebar-nav">
        {nav.map((item) => (
          <Link key={item.to} to={item.to} className={`nav-item ${isActive(item.to, item.exact) ? 'active' : ''}`}>
            <item.icon size={18} />
            <span>{item.label}</span>
            {!!item.badge && <span className="nav-badge">{item.badge}</span>}
          </Link>
        ))}
      </nav>
      <div className="sidebar-section">
        <div className="sidebar-label">{role === 'professor' ? 'Your courses' : 'Your courses'}</div>
        {courseLinks.map((c) => (
          <Link key={c.id} to={`${base}/course/${c.id}`} className={`nav-course ${path.startsWith(`${base}/course/${c.id}`) ? 'active' : ''}`}>
            <i style={{ background: c.color }} />
            <span className="nav-course-code">{c.code}</span>
            <span className="nav-course-title">{c.title}</span>
          </Link>
        ))}
      </div>
      <div className="sidebar-foot">
        <div className="canvas-card">
          <div className="canvas-card-head"><span className="pulse" /> Canvas connected</div>
          <p>Courses, assignments, grades and activity update automatically.</p>
          <button className="canvas-card-link" onClick={() => toast('Opening Canvas…')}>Open Canvas <ExternalLink size={12} /></button>
        </div>
        <Link to="/" className="nav-item switch"><Repeat size={16} /> <span>Switch portal</span></Link>
      </div>
    </aside>
  );
}

function Topbar({ role }: { role: Role }) {
  const person = role === 'professor'
    ? { name: getProfessor(DEMO_PROFESSOR).name, initials: getProfessor(DEMO_PROFESSOR).initials, sub: 'Faculty' }
    : { name: getStudent(DEMO_STUDENT)!.name, initials: getStudent(DEMO_STUDENT)!.initials, sub: `${getStudent(DEMO_STUDENT)!.year} · ${getStudent(DEMO_STUDENT)!.major}` };
  return (
    <header className="topbar">
      <Link to="/" className="topbar-brand"><Wordmark /></Link>
      <div className="topbar-term"><CalendarDays size={16} /> {TERM.name} · Week {TERM.currentWeek} of {TERM.weeks}</div>
      <div className="topbar-right">
        <CanvasSync label="Updated from Canvas" />
        <div className="topbar-person">
          <Avatar initials={person.initials} size={36} dark />
          <div>
            <div className="topbar-name">{person.name}</div>
            <div className="topbar-sub">{person.sub}</div>
          </div>
        </div>
      </div>
    </header>
  );
}

function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => <div key={t.id} className={`toast toast-${t.tone}`}>{t.text}</div>)}
    </div>
  );
}
