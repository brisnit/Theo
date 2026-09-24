import type { ReactNode } from 'react';
import { Shell, ViewUnavailable } from './components/Shell';
import { getCourse, getEnrollment } from './data/insights';
import { DEMO_PROFESSOR, DEMO_STUDENT } from './data/mock';
import type { Role } from './data/types';
import type { AssistantContext } from './lib/assistant';
import { useRoute } from './lib/router';
import { Home } from './pages/Home';
import { MessagesPage } from './pages/MessagesPage';
import { CourseView } from './pages/professor/CourseView';
import { ImpactPage } from './pages/professor/ImpactPage';
import { ProfessorDashboard } from './pages/professor/ProfessorDashboard';
import { StudentProfile } from './pages/professor/StudentProfile';
import { StudentsPage } from './pages/professor/StudentsPage';
import { StudentCourse } from './pages/student/StudentCourse';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { AppStateProvider } from './state/AppState';

const NotFound = ViewUnavailable;

function resolve(path: string): { role: Role; page: ReactNode; ctx: AssistantContext } | null {
  const [area, section, id, sub, subId] = path.split('/').filter(Boolean);

  if (area === 'professor') {
    const role = 'professor';
    const ownsCourse = id && getCourse(id)?.professorId === DEMO_PROFESSOR;
    if (!section) return { role, page: <ProfessorDashboard />, ctx: {} };
    if (section === 'course' && ownsCourse && sub === 'student' && subId && getEnrollment(id, subId)) {
      return { role, page: <StudentProfile key={`${id}:${subId}`} courseId={id} studentId={subId} />, ctx: { courseId: id, studentId: subId } };
    }
    if (section === 'course' && ownsCourse && !sub) return { role, page: <CourseView key={id} courseId={id} />, ctx: { courseId: id } };
    if (section === 'students') return { role, page: <StudentsPage />, ctx: {} };
    if (section === 'messages') return { role, page: <MessagesPage role={role} threadId={id} />, ctx: {} };
    if (section === 'impact') return { role, page: <ImpactPage />, ctx: {} };
    return { role, page: <NotFound role={role} />, ctx: {} };
  }

  if (area === 'student') {
    const role = 'student';
    if (!section) return { role, page: <StudentDashboard />, ctx: {} };
    if (section === 'course' && id && getEnrollment(id, DEMO_STUDENT)) return { role, page: <StudentCourse key={id} courseId={id} />, ctx: { courseId: id } };
    if (section === 'messages') return { role, page: <MessagesPage role={role} threadId={id} />, ctx: {} };
    return { role, page: <NotFound role={role} />, ctx: {} };
  }

  return null;
}

export default function App() {
  const path = useRoute();
  const route = resolve(path);
  return (
    <AppStateProvider>
      {route ? <Shell role={route.role} path={path} ctx={route.ctx}>{route.page}</Shell> : <Home />}
    </AppStateProvider>
  );
}
