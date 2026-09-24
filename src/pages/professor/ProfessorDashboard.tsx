import { ArrowRight, ChevronRight } from 'lucide-react';
import { ProfessorCourseCard } from '../../components/CourseCards';
import { CustomDashboard, type DashItem } from '../../components/Dashboard';
import { TrendChart } from '../../components/charts';
import { Avatar, Card, CourseChip, InsightCard, PageHeader, RiskBadge } from '../../components/ui';
import { dueLabel, fmtDate, fmtTime, greeting, longToday } from '../../data/calendar';
import {
  courseStats, getCourse, getProfessor, getStudent, impactSummary, primarySignal, professorAttention, professorCourses,
  professorEnrollments, professorInterventions, recommendation, upcomingAssignments,
} from '../../data/insights';
import { DEMO_PROFESSOR } from '../../data/mock';
import { counterpart } from '../../components/Chat';
import { Link } from '../../lib/router';
import { useApp } from '../../state/AppState';

export function ProfessorDashboard() {
  const { threads, openChat, askTheo, addedInterventions } = useApp();
  const prof = getProfessor(DEMO_PROFESSOR);
  const courses = professorCourses(DEMO_PROFESSOR);
  const es = professorEnrollments(DEMO_PROFESSOR);
  const high = es.filter((e) => e.risk === 'high').length;
  const watch = es.filter((e) => e.risk === 'moderate').length;
  const attention = professorAttention(DEMO_PROFESSOR, 5);
  const allInterventions = [...addedInterventions, ...professorInterventions(DEMO_PROFESSOR)];
  const impact = impactSummary(allInterventions);
  const eng = courseStats('st505');
  const showcase = allInterventions.find((i) => i.id === 'iv-ethan-thesis')!;

  const upcoming = courses
    .flatMap((c) => upcomingAssignments(c).map((a) => ({ a, stat: courseStats(c.id).upcoming.find((u) => u.assignment.id === a.id)! })))
    .sort((x, y) => x.a.due.localeCompare(y.a.due))
    .slice(0, 5);

  const myThreads = threads
    .filter((t) => t.professorId === DEMO_PROFESSOR)
    .sort((a, b) => (b.messages.at(-1)?.time ?? '').localeCompare(a.messages.at(-1)?.time ?? ''))
    .slice(0, 4);

  const items: DashItem[] = [
    {
      id: 'briefing', title: 'Theo Insight', span: 8,
      node: (
        <InsightCard
          title="Theo Insight · Today's briefing"
          actions={(
            <>
              <button className="btn btn-light" onClick={() => askTheo('Who needs my attention today?')}>Who needs me today?</button>
              <button className="btn btn-outline-light" onClick={() => askTheo('What changed this week?')}>What changed this week?</button>
            </>
          )}
        >
          <p className="insight-text">
            Your courses are academically healthy overall, but ST505 engagement has declined {-eng.engagementChange}% in two weeks.{' '}
            {high} students are at high risk across your courses, and {impact.rate}% of your measured interventions this term improved a student's trajectory.
          </p>
        </InsightCard>
      ),
    },
    {
      id: 'summary', title: 'Teaching snapshot', span: 4,
      node: (
        <Card className="snapshot">
          <div className="snapshot-person">
            <Avatar initials={prof.initials} size={52} dark />
            <div>
              <div className="snapshot-name">{prof.name}</div>
              <div className="muted small">{prof.title}</div>
            </div>
          </div>
          <div className="snapshot-grid">
            <div><b>{courses.length}</b><span>Courses</span></div>
            <div><b>{es.length}</b><span>Enrollments</span></div>
            <div><b className="tone-watch">{high + watch}</b><span>Need you</span></div>
            <div><b className="tone-blue">{impact.improved}</b><span>Interventions working</span></div>
          </div>
        </Card>
      ),
    },
    {
      id: 'courses', title: 'Your courses', span: 12,
      node: (
        <div className="section-block">
          <div className="section-head">
            <h2>Your courses</h2>
            <span className="muted">{courses.length} courses · {es.length} enrollments · synced from Canvas</span>
          </div>
          <div className="course-grid">
            {courses.map((c) => <ProfessorCourseCard key={c.id} course={c} />)}
          </div>
        </div>
      ),
    },
    {
      id: 'attention', title: 'Needs attention', span: 8,
      node: (
        <Card eyebrow="Needs attention" title="Who needs you this week" action={<Link to="/professor/students" className="text-link">All students <ArrowRight size={14} /></Link>}>
          <div className="attn-list">
            {attention.map((e) => {
              const s = getStudent(e.studentId)!;
              const rec = recommendation(e);
              return (
                <Link key={e.id} to={`/professor/course/${e.courseId}/student/${e.studentId}`} className="attn-row">
                  <Avatar initials={s.initials} size={42} />
                  <div className="attn-main">
                    <div className="attn-name">{s.name} <CourseChip course={getCourse(e.courseId)!} /></div>
                    <div className="attn-signal">{primarySignal(e)} · <span className="muted">{rec.urgency}</span></div>
                  </div>
                  <div className="attn-grade">
                    <span>{e.current}%</span>
                    <ArrowRight size={14} />
                    <span className={e.risk === 'high' ? 'tone-high' : 'tone-watch'}>{e.predicted}%</span>
                  </div>
                  <RiskBadge risk={e.risk} />
                  <ChevronRight size={16} className="muted" />
                </Link>
              );
            })}
          </div>
        </Card>
      ),
    },
    {
      id: 'impact', title: 'Intervention impact', span: 4,
      node: (
        <Card eyebrow="Prove" title="Are interventions working?" action={<Link to="/professor/impact" className="text-link">Impact <ArrowRight size={14} /></Link>}>
          <div className="impact-hero">
            <span className="impact-big">{impact.rate}%</span>
            <span className="muted">of measured interventions improved a student's trajectory</span>
          </div>
          <div className="impact-mini">
            <div><b>+{impact.avgGain}</b><span>avg. mastery gain</span></div>
            <div><b>{impact.lowered}</b><span>moved to lower risk</span></div>
            <div><b>{impact.measuring}</b><span>measuring now</span></div>
          </div>
          <div className="impact-story">
            <div className="muted small">{fmtDate(showcase.steps[0].date)} – {fmtDate(showcase.steps.at(-1)!.date)} · ST505</div>
            <div><b>Ethan Brooks</b> · Theological Argument {showcase.masteryFrom}% → {showcase.masteryTo}%</div>
            <div className="impact-risk"><RiskBadge risk="high" label="High" /> <ArrowRight size={14} /> <RiskBadge risk="moderate" label="Moderate" /></div>
          </div>
        </Card>
      ),
    },
    {
      id: 'upcoming', title: 'Upcoming', span: 4,
      node: (
        <Card eyebrow="From Canvas" title="Assignments approaching">
          <div className="due-list">
            {upcoming.map(({ a, stat }) => (
              <div key={a.id} className="due-row">
                <div className="date-block"><span>{fmtDate(a.due).split(' ')[0]}</span><b>{fmtDate(a.due).split(' ')[1]}</b></div>
                <div className="due-main">
                  <div className="due-title">{a.title}</div>
                  <div className="due-sub"><CourseChip course={getCourse(a.courseId)!} /> {dueLabel(a.due)} · {stat.notStarted} not started</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ),
    },
    {
      id: 'engagement', title: 'Engagement', span: 4,
      node: (
        <Card eyebrow="Canvas activity" title="Engagement by course">
          <TrendChart
            height={200}
            labels={['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8']}
            series={courses.map((c) => ({ label: c.code, color: c.color, data: courseStats(c.id).engagementTrend }))}
          />
        </Card>
      ),
    },
    {
      id: 'messages', title: 'Messages', span: 4,
      node: (
        <Card title="Messages" action={<Link to="/professor/messages" className="text-link">Inbox <ArrowRight size={14} /></Link>}>
          <div className="thread-list compact">
            {myThreads.map((t) => {
              const other = counterpart(t, 'professor');
              const last = t.messages.at(-1);
              return (
                <button key={t.id} className="thread-row" onClick={() => openChat(t.id, 'professor')}>
                  <Avatar initials={other.initials} size={36} />
                  <div className="thread-main">
                    <div className="thread-top"><b>{other.name}</b><span className="muted small">{last ? fmtTime(last.time) : ''}</span></div>
                    <div className="thread-snippet">{last?.from === 'professor' ? 'You: ' : ''}{last?.text}</div>
                  </div>
                  {t.unread.professor > 0 && <span className="unread-dot" />}
                </button>
              );
            })}
          </div>
        </Card>
      ),
    },
  ];

  return (
    <CustomDashboard
      role="professor"
      storageKey="theo:layout:professor"
      items={items}
      header={(controls) => (
        <PageHeader
          eyebrow={`${longToday()} · Week 8 of 16`}
          title={`${greeting()}, Dr. ${prof.last}`}
          subtitle={`${high + watch} students need you across ${courses.length} courses. Here's who, why, and what to do.`}
          actions={controls}
        />
      )}
    />
  );
}
