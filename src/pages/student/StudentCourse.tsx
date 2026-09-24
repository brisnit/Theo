import { MessageSquare, Play } from 'lucide-react';
import { MasteryBars, TrendChart } from '../../components/charts';
import { CanvasButton, Card, CourseChip, InsightCard, PageHeader, StatusPill } from '../../components/ui';
import { WEEK_LABELS, dueLabel } from '../../data/calendar';
import {
  getCourse, getEnrollment, getProfessor, pastAssignments, projection, strongest, studentStatus, studentSummary,
  upcomingAssignments, weakest,
} from '../../data/insights';
import { DEMO_STUDENT } from '../../data/mock';
import { C } from '../../data/palette';
import { useApp } from '../../state/AppState';

export function StudentCourse({ courseId }: { courseId: string }) {
  const { openChat, ensureThread, openReview, doneTasks } = useApp();
  const e = getEnrollment(courseId, DEMO_STUDENT)!;
  const course = getCourse(courseId)!;
  const prof = getProfessor(course.professorId);
  const status = studentStatus(e);
  const attention = e.risk !== 'low';
  const w = weakest(e);
  const best = strongest(e);
  const nulls = (n: number) => Array(n).fill(null);
  const proj = projection(e.current, e.predicted);
  const caughtUp = projection(e.current, Math.round(e.predicted + (e.current - e.predicted) * 0.8));
  const summary = studentSummary(DEMO_STUDENT);
  const reviewStarted = doneTasks[`review:${e.id}`];

  const message = () => openChat(ensureThread(course.professorId, DEMO_STUDENT, courseId), 'student');

  const headline = attention
    ? `You're at ${e.current}% right now. If the last two weeks continue, you'd finish around ${e.predicted}%. The good news: this is very fixable.`
    : `You're at ${e.current}% and headed toward about ${e.predicted}%. Keep doing what you're doing.`;

  return (
    <div className="page">
      <PageHeader
        back={{ to: '/student', label: 'Dashboard' }}
        eyebrow={<><CourseChip course={course} /> <span>{prof.name} · {course.schedule}</span></>}
        title={`${course.code} — ${course.title}`}
        actions={(
          <>
            <button className="btn btn-dark" onClick={message}><MessageSquare size={16} /> Message {prof.name.split(' ')[0]} {prof.last}</button>
            <CanvasButton what={course.code} />
          </>
        )}
      />

      <InsightCard
        className="insight-wide"
        meta={<StatusPill status={status} />}
        actions={attention && !reviewStarted ? <button className="btn btn-light" onClick={() => openReview(e.id)}><Play size={15} /> Start Review</button> : undefined}
      >
        <p className="insight-text large">{headline}</p>
        {attention && summary.focus?.id === e.id && <p className="insight-sub">{summary.insight}</p>}
      </InsightCard>

      <div className="grid-12">
        <Card className="span-8" eyebrow="Where you're headed" title="Your grade" action={<span className="legend-note"><i className="solid" /> So far <i className="dashed" /> Current path {attention && <><i className="dashed peri" /> If you catch up this week</>}</span>}>
          <TrendChart
            height={250}
            labels={WEEK_LABELS}
            legend={false}
            marker={{ index: 7, label: 'Today' }}
            series={[
              { label: 'Your grade', data: [...e.grades, ...nulls(8)], color: C.blue, area: true },
              { label: 'Current path', data: [...nulls(7), ...proj], color: attention ? C.watch : C.blue, dashed: true },
              ...(attention ? [{ label: 'If you catch up', data: [...nulls(7), ...caughtUp], color: C.peri, dashed: true }] : []),
            ]}
          />
        </Card>

        <Card className="span-4" eyebrow="Personalized for you" title="What to do next">
          <ul className="todo plain">
            {attention && (
              <li className="highlight">
                <div className="todo-main">
                  <div className="todo-title">Review {w.concept}</div>
                  <div className="todo-sub">15 minutes · biggest impact on this course</div>
                </div>
                {!reviewStarted && <button className="btn btn-primary btn-sm" onClick={() => openReview(e.id)}>Start</button>}
              </li>
            )}
            {e.submissions.filter((s) => s.status === 'missing').map((s) => (
              <li key={s.assignmentId}>
                <div className="todo-main">
                  <div className="todo-title">Ask about {course.assignments.find((a) => a.id === s.assignmentId)!.title}</div>
                  <div className="todo-sub">Still open — {prof.name} may accept it late</div>
                </div>
              </li>
            ))}
            {upcomingAssignments(course).slice(0, 2).map((a) => (
              <li key={a.id}>
                <div className="todo-main">
                  <div className="todo-title">{a.title}</div>
                  <div className="todo-sub">Due {dueLabel(a.due)} · uses {a.concept}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="span-6" eyebrow="Skills" title="Mastery">
          <MasteryBars
            items={[...e.mastery].sort((a, b) => b.value - a.value).map((m) => ({
              ...m, note: m.value >= 80 ? 'Strong' : m.value >= 70 ? 'Growing' : 'Focus area — a short review will help',
            }))}
          />
          <p className="fine">Your strongest area is {best.concept}. Tick marks show where you were two weeks ago.</p>
        </Card>

        <Card className="span-6" eyebrow="From Canvas" title="Assignments">
          <div className="assign-list">
            {upcomingAssignments(course).map((a) => (
              <div key={a.id} className="assign-row">
                <span className="assign-title">{a.title}</span>
                <span className="badge">Due {dueLabel(a.due)}</span>
              </div>
            ))}
            {[...pastAssignments(course)].reverse().map((a) => {
              const sub = e.submissions.find((x) => x.assignmentId === a.id)!;
              return (
                <div key={a.id} className="assign-row">
                  <span className="assign-title">{a.title}</span>
                  <span className={`badge sub-${sub.status}`}>
                    {sub.status === 'missing' ? 'Not turned in yet' : sub.status === 'late' ? `Turned in late · ${sub.score}%` : `${sub.score}%`}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
