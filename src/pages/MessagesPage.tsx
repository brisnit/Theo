import { ArrowRight } from 'lucide-react';
import { Conversation, counterpart } from '../components/Chat';
import { Avatar, PageHeader } from '../components/ui';
import { fmtTime } from '../data/calendar';
import { DEMO_PROFESSOR, DEMO_STUDENT } from '../data/mock';
import type { Role } from '../data/types';
import { Link, navigate } from '../lib/router';
import { useApp } from '../state/AppState';

export function MessagesPage({ role, threadId }: { role: Role; threadId?: string }) {
  const { threads } = useApp();
  const mine = threads
    .filter((t) => (role === 'professor' ? t.professorId === DEMO_PROFESSOR : t.studentId === DEMO_STUDENT))
    .sort((a, b) => (b.messages.at(-1)?.time ?? '').localeCompare(a.messages.at(-1)?.time ?? ''));
  const selected = mine.find((t) => t.id === threadId) ?? mine[0];
  const other = selected ? counterpart(selected, role) : undefined;

  return (
    <div className="page">
      <PageHeader
        title="Messages"
        subtitle={role === 'professor'
          ? 'Direct conversations with your students. Start one from any student profile.'
          : 'Reach your professors directly. They usually reply within a few hours.'}
      />
      <div className="messages-page">
        <div className="card thread-panel">
          <div className="thread-list">
            {mine.map((t) => {
              const o = counterpart(t, role);
              const last = t.messages.at(-1);
              return (
                <button key={t.id} className={`thread-row ${selected?.id === t.id ? 'active' : ''}`} onClick={() => navigate(`/${role}/messages/${t.id}`)}>
                  <Avatar initials={o.initials} size={40} dark={role === 'student'} />
                  <div className="thread-main">
                    <div className="thread-top"><b>{o.name}</b><span className="muted small">{last ? fmtTime(last.time) : ''}</span></div>
                    <div className="thread-sub">{o.sub}</div>
                    <div className="thread-snippet">{last ? `${last.from === role ? 'You: ' : ''}${last.text}` : 'No messages yet'}</div>
                  </div>
                  {t.unread[role] > 0 && <span className="unread-dot" />}
                </button>
              );
            })}
          </div>
        </div>
        {selected && other && (
          <div className="card convo-panel">
            <header className="drawer-head">
              <Avatar initials={other.initials} size={42} dark={role === 'student'} />
              <div className="drawer-title">
                <strong>{other.name}</strong>
                <span>{other.sub}</span>
              </div>
              {role === 'professor' ? (
                <Link to={`/professor/course/${selected.courseId}/student/${selected.studentId}`} className="text-link">View profile <ArrowRight size={14} /></Link>
              ) : (
                <Link to={`/student/course/${selected.courseId}`} className="text-link">Open course <ArrowRight size={14} /></Link>
              )}
            </header>
            <Conversation threadId={selected.id} role={role} />
          </div>
        )}
      </div>
    </div>
  );
}
