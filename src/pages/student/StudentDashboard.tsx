import { ArrowRight, Check, CheckCircle2, PenLine, Play } from 'lucide-react';
import { StudentCourseCard } from '../../components/CourseCards';
import { CustomDashboard, type DashItem } from '../../components/Dashboard';
import { Columns, MasteryBars, Ring, TrendChart } from '../../components/charts';
import { counterpart } from '../../components/Chat';
import { Avatar, Card, CourseChip, Delta, InsightCard, PageHeader, StatusPill } from '../../components/ui';
import { dueLabel, fmtDate, fmtTime, greeting, longToday } from '../../data/calendar';
import {
  getCourse, getStudent, nextActions, studentStatus, studentSummary, studentUpcoming,
} from '../../data/insights';
import { DEMO_STUDENT } from '../../data/mock';
import { C } from '../../data/palette';
import { Link } from '../../lib/router';
import { useApp } from '../../state/AppState';

export function StudentDashboard() {
  const { askTheo, openReview, doneTasks, toggleTask, threads, openChat } = useApp();
  const me = getStudent(DEMO_STUDENT)!;
  const summary = studentSummary(DEMO_STUDENT);
  const actions = nextActions(DEMO_STUDENT);
  const upcoming = studentUpcoming(DEMO_STUDENT).slice(0, 5);
  const focus = summary.focus;
  const reviewStarted = focus && doneTasks[`review:${focus.id}`];

  const allMastery = summary.enrollments.flatMap((e) => e.mastery.map((m) => ({ ...m, code: getCourse(e.courseId)!.code })));
  const sorted = [...allMastery].sort((a, b) => b.value - a.value);
  const masteryItems = [...sorted.slice(0, 2), ...sorted.slice(-2)];

  const weeklySessions = Array.from({ length: 8 }, (_, i) => summary.enrollments.reduce((s, e) => s + e.visits[i], 0));
  const usualSessions = summary.enrollments.reduce((s, e) => s + e.baselineVisits, 0);

  const myThreads = threads
    .filter((t) => t.studentId === DEMO_STUDENT)
    .sort((a, b) => (b.messages.at(-1)?.time ?? '').localeCompare(a.messages.at(-1)?.time ?? ''));

  const items: DashItem[] = [
    {
      id: 'insight', title: 'Theo Insight', span: 8,
      node: (
        <InsightCard
          actions={(
            <>
              {focus && !reviewStarted && (
                <button className="btn btn-light" onClick={() => openReview(focus.id)}><Play size={15} /> Start Review</button>
              )}
              {reviewStarted && <span className="insight-done"><CheckCircle2 size={16} /> Review started — that's your biggest win today</span>}
              <button className="btn btn-outline-light" onClick={() => askTheo('What can I do tonight?')}>What can I do tonight?</button>
            </>
          )}
        >
          <p className="insight-text">{summary.insight}</p>
        </InsightCard>
      ),
    },
    {
      id: 'progress', title: 'Your progress', span: 4,
      node: (
        <Card eyebrow="Your semester" title="Your progress" className="progress-card">
          <div className="progress-body">
            <Ring value={summary.progress} size={128} thickness={12}>
              <b>{summary.progress}%</b>
              <span>Overall progress</span>
            </Ring>
            <div className="progress-facts">
              <div><span className="stat-label">Momentum</span><Delta value={summary.momentum} className="delta-lg" /></div>
              <div><span className="stat-label">On Track</span><b>{summary.onTrack} Courses</b></div>
              <div><span className="stat-label">Needs Attention</span><b className={summary.needsAttention ? 'tone-watch' : ''}>{summary.needsAttention} Course{summary.needsAttention === 1 ? '' : 's'}</b></div>
            </div>
          </div>
        </Card>
      ),
    },
    {
      id: 'courses', title: 'Courses', span: 12,
      node: (
        <div className="section-block">
          <div className="section-head">
            <h2>Your courses</h2>
            <span className="muted">All {summary.enrollments.length} of your Canvas courses, in one place</span>
          </div>
          <div className="course-grid four">
            {summary.enrollments.map((e) => <StudentCourseCard key={e.id} enrollment={e} />)}
          </div>
        </div>
      ),
    },
    {
      id: 'next', title: 'What to do next', span: 4,
      node: (
        <Card eyebrow="Personalized for you" title="What to do next">
          <ul className="todo">
            {actions.map((a) => {
              const done = !!doneTasks[a.id];
              return (
                <li key={a.id} className={`${done ? 'done' : ''} ${a.highlight ? 'highlight' : ''}`}>
                  <button className="check" onClick={() => toggleTask(a.id)} aria-label={done ? 'Mark not done' : 'Mark done'}>
                    {done && <Check size={14} strokeWidth={3} />}
                  </button>
                  <div className="todo-main">
                    <div className="todo-title">{a.title}</div>
                    <div className="todo-sub">{a.detail}</div>
                  </div>
                  {a.kind === 'review' && !done && (
                    <button className="btn btn-primary btn-sm" onClick={() => openReview(a.enrollmentId)}>Start</button>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      ),
    },
    {
      id: 'upcoming', title: 'Upcoming', span: 4,
      node: (
        <Card eyebrow="From Canvas" title="Upcoming">
          <div className="due-list">
            {upcoming.map((a) => (
              <div key={a.id} className="due-row">
                <div className="date-block"><span>{fmtDate(a.due).split(' ')[0]}</span><b>{fmtDate(a.due).split(' ')[1]}</b></div>
                <div className="due-main">
                  <div className="due-title">{a.title}</div>
                  <div className="due-sub"><CourseChip course={getCourse(a.courseId)!} /> {dueLabel(a.due)}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ),
    },
    {
      id: 'momentum', title: 'Momentum', span: 4,
      node: (
        <Card eyebrow="Where you're headed" title="Momentum" action={<Delta value={summary.momentum} />}>
          <TrendChart
            height={150}
            legend={false}
            labels={['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10', 'W11', 'W12']}
            marker={{ index: 7, label: 'Now' }}
            series={[
              { label: 'Average grade', data: [...summary.trend, null, null, null, null], color: C.blue, area: true },
              { label: 'Predicted', data: [...Array(7).fill(null), ...summary.projection.slice(0, 5)], color: C.blue, dashed: true },
            ]}
          />
          <div className="momentum-list">
            {summary.enrollments.map((e) => (
              <div key={e.id}>
                <CourseChip course={getCourse(e.courseId)!} />
                <StatusPill status={studentStatus(e)} />
              </div>
            ))}
          </div>
        </Card>
      ),
    },
    {
      id: 'mastery', title: 'Mastery', span: 4,
      node: (
        <Card eyebrow="Skills" title="Mastery">
          <MasteryBars
            showPrev={false}
            items={masteryItems.map((m) => ({
              concept: m.concept, value: m.value,
              note: `${m.code} · ${m.value >= 80 ? 'Strong' : m.value >= 70 ? 'Growing' : 'Focus area'}`,
            }))}
          />
        </Card>
      ),
    },
    {
      id: 'activity', title: 'Activity', span: 4,
      node: (
        <Card eyebrow="Canvas activity" title="Your study rhythm">
          <Columns values={weeklySessions} labels={['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8']} baseline={usualSessions} height={130} />
          <p className="fine">
            {weeklySessions[7] < usualSessions * 0.9
              ? `You logged ${weeklySessions[7]} Canvas sessions this week — a little below your usual ${usualSessions}. A couple of short sessions would get you back to your rhythm.`
              : `You logged ${weeklySessions[7]} Canvas sessions this week — right on your usual rhythm.`}
          </p>
        </Card>
      ),
    },
    {
      id: 'messages', title: 'Messages', span: 4,
      node: (
        <Card title="Messages" action={<Link to="/student/messages" className="text-link">All <ArrowRight size={14} /></Link>}>
          <div className="thread-list compact">
            {myThreads.map((t) => {
              const other = counterpart(t, 'student');
              const last = t.messages.at(-1);
              return (
                <button key={t.id} className="thread-row" onClick={() => openChat(t.id, 'student')}>
                  <Avatar initials={other.initials} size={36} dark />
                  <div className="thread-main">
                    <div className="thread-top"><b>{other.name}</b><span className="muted small">{last ? fmtTime(last.time) : ''}</span></div>
                    <div className="thread-snippet">{last?.from === 'student' ? 'You: ' : ''}{last?.text}</div>
                  </div>
                  {t.unread.student > 0 && <span className="unread-dot" />}
                </button>
              );
            })}
          </div>
          <button className="btn btn-ghost btn-block" onClick={() => openChat('whitfield:maya-johnson', 'student')}>
            <PenLine size={15} /> Message Dr. Whitfield
          </button>
        </Card>
      ),
    },
  ];

  return (
    <CustomDashboard
      role="student"
      storageKey="theo:layout:student"
      items={items}
      header={(controls) => (
        <PageHeader
          eyebrow={`${longToday()} · Fall 2026`}
          title={`${greeting()}, ${me.first}.`}
          subtitle="You're making progress. Here's what deserves your attention next."
          actions={controls}
        />
      )}
    />
  );
}
