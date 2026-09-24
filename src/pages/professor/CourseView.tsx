import { ArrowDownRight, CheckCircle2, Users } from 'lucide-react';
import { Roster } from '../../components/Roster';
import { Donut, MasteryBars, StackedColumns, TrendChart } from '../../components/charts';
import { Avatar, CanvasButton, CanvasSync, Card, CourseChip, Delta, InsightCard, PageHeader, RiskBadge, Stat } from '../../components/ui';
import { WEEK_LABELS, dueLabel } from '../../data/calendar';
import {
  courseEnrollments, courseStats, getCourse, getStudent, primarySignal, recommendation, riskShort,
} from '../../data/insights';
import { C } from '../../data/palette';
import { Link } from '../../lib/router';
import { useApp } from '../../state/AppState';

const shortTitle = (t: string) => t.split(/[:—]/)[0].trim().split(' ').slice(0, 2).join(' ');

export function CourseView({ courseId }: { courseId: string }) {
  const { askTheo, actions } = useApp();
  const course = getCourse(courseId)!;
  const st = courseStats(courseId);
  const actual = [...st.gradeTrend, ...Array(8).fill(null)];
  const predicted = [...Array(7).fill(null), ...st.projection];
  const band = st.projection.map((v, i) => [v - (0.6 + i * 0.45), v + (0.6 + i * 0.45)]);
  const lo = [...Array(7).fill(null), ...band.map((b) => b[0])];
  const hi = [...Array(7).fill(null), ...band.map((b) => b[1])];
  const conceptsSorted = [...st.concepts].sort((a, b) => a.value - b.value);
  const lateRecent = st.submissions.slice(-2).reduce((s, x) => s + x.late + x.missing, 0);
  const lateEarly = st.submissions.slice(0, 2).reduce((s, x) => s + x.late + x.missing, 0);

  return (
    <div className="page">
      <PageHeader
        back={{ to: '/professor', label: 'Dashboard' }}
        eyebrow={<><CourseChip course={course} /> <span>{course.schedule} · Fall 2026</span></>}
        title={`${course.code} — ${course.title}`}
        subtitle={`${st.size} students · class-level intelligence from Canvas grades, submissions and activity`}
        actions={<><CanvasSync /><CanvasButton what={course.code} /></>}
      />

      <InsightCard
        className="insight-wide"
        actions={(
          <>
            <a className="btn btn-light" href="#attention" onClick={(e) => { e.preventDefault(); document.getElementById('attention')?.scrollIntoView({ behavior: 'smooth' }); }}>
              See who needs attention
            </a>
            <button className="btn btn-outline-light" onClick={() => askTheo(`How is ${course.code} doing?`)}>Ask Theo about {course.code}</button>
          </>
        )}
      >
        <p className="insight-text large">“{st.insight}”</p>
      </InsightCard>

      <div className="kpi-grid">
        <Card><Stat label="Current Average" value={`${st.current}%`} sub="From Canvas gradebook" /></Card>
        <Card><Stat label="Predicted Average" value={`${st.predicted}%`} tone={st.predicted < st.current - 1 ? 'watch' : 'blue'} sub={`End of term · ±${Math.round(band.at(-1)![1] - st.projection.at(-1)!)} pts`} /></Card>
        <Card><Stat label="Overall Mastery" value={`${st.mastery}%`} sub={`${course.concepts.length} concepts tracked`} /></Card>
        <Card><Stat label="Engagement" value={`${st.engagement}%`} sub={<><Delta value={st.engagementChange} /> in 14 days</>} /></Card>
        <Card><Stat label="Completion" value={`${st.completion}%`} sub="Assignments submitted" /></Card>
        <Card><Stat label="Class Momentum" value={<Delta value={st.momentum} className="delta-lg" />} sub="Grades + engagement, 14 days" /></Card>
      </div>

      <div className="grid-12">
        <Card className="span-8" eyebrow="Predict" title="Performance trend" action={<span className="legend-note"><i className="solid" /> Actual <i className="dashed" /> Predicted</span>}>
          <TrendChart
            height={250}
            labels={WEEK_LABELS}
            legend={false}
            marker={{ index: 7, label: 'Today' }}
            series={[
              { label: 'Class average', data: actual, color: C.blue, area: true },
              { label: 'Predicted', data: predicted, color: C.blue, dashed: true },
            ]}
            band={{ lo, hi }}
          />
        </Card>

        <Card className="span-4" eyebrow="Learner state" title="Risk distribution">
          <div className="risk-dist">
            <Donut
              segments={[
                { label: 'On Track', value: st.onTrack, color: C.blue },
                { label: 'Watch', value: st.watch, color: C.watch },
                { label: 'High Risk', value: st.high, color: C.high },
              ]}
              center={<><b>{st.size}</b><span>students</span></>}
            />
            <div className="risk-legend">
              <div><i style={{ background: C.blue }} /> On track <b>{st.onTrack}</b></div>
              <div><i style={{ background: C.watch }} /> Watch <b>{st.watch}</b></div>
              <div><i style={{ background: C.high }} /> High risk <b>{st.high}</b></div>
            </div>
          </div>
          <div className="risk-foot">
            <ArrowDownRight size={16} />
            <span><b>{st.trendingDown} students</b> trending downward — predicted to finish below their current grade.</span>
          </div>
        </Card>
      </div>

      <div className="section-block" id="attention">
        <div className="section-head">
          <h2>Needs attention</h2>
          <span className="muted">{st.attention.length} students · sorted by predicted change</span>
        </div>
        <div className="student-card-grid">
          {st.attention.map((e) => {
            const s = getStudent(e.studentId)!;
            const rec = recommendation(e);
            const done = actions[e.id];
            return (
              <Link key={e.id} to={`/professor/course/${courseId}/student/${e.studentId}`} className={`card student-card risk-edge-${e.risk}`}>
                <div className="sc-head">
                  <Avatar initials={s.initials} size={44} />
                  <div>
                    <div className="sc-name">{s.name}</div>
                    <div className="muted small">{s.year} · Active {e.lastActive.toLowerCase()}</div>
                  </div>
                  <RiskBadge risk={e.risk} label={`Risk: ${riskShort(e.risk)}`} />
                </div>
                <div className="sc-grades">
                  <div><span className="stat-label">Current Grade</span><b>{e.current}%</b></div>
                  <div><span className="stat-label">Predicted Grade</span><b className={e.risk === 'high' ? 'tone-high' : 'tone-watch'}>{e.predicted}%</b></div>
                </div>
                <dl className="sc-facts">
                  <div><dt>Engagement</dt><dd><Delta value={e.engagementChange} /></dd></div>
                  <div><dt>Primary signal</dt><dd>{primarySignal(e)}</dd></div>
                  <div><dt>Recommendation</dt><dd>{e.risk === 'high' ? rec.urgency : rec.title.replace(/\.$/, '')}</dd></div>
                </dl>
                {done && done.kind !== 'dismissed' && (
                  <div className="sc-done"><CheckCircle2 size={15} /> Action taken today — Theo is measuring impact</div>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid-12">
        <Card className="span-6" eyebrow="Mastery signals" title="Concepts students are struggling with">
          <MasteryBars items={conceptsSorted.map((c) => ({ ...c, note: c.struggling ? `${c.struggling} students below 70%` : 'No students below 70%' }))} />
        </Card>
        <Card className="span-6" eyebrow="Canvas activity" title="Engagement trend" action={<Delta value={st.engagementChange} />}>
          <TrendChart
            height={236}
            labels={WEEK_LABELS.slice(0, 8)}
            legend={false}
            series={[{ label: 'Engagement', data: st.engagementTrend, color: C.peri, area: true }]}
          />
        </Card>
        <Card className="span-7" eyebrow="Submission behavior" title="On time, late and missing" action={lateRecent > lateEarly ? <span className="badge risk-moderate"><i />Late work rising</span> : undefined}>
          <StackedColumns
            height={200}
            keys={[{ label: 'On time', color: C.blue }, { label: 'Late', color: C.peri }, { label: 'Missing', color: C.high }]}
            columns={st.submissions.map((s) => ({ label: shortTitle(s.assignment.title), title: s.assignment.title, values: [s.onTime, s.late, s.missing] }))}
          />
        </Card>
        <Card className="span-5" eyebrow="From Canvas" title="Assignments approaching">
          <div className="due-list">
            {st.upcoming.map((u) => (
              <div key={u.assignment.id} className="due-row">
                <div className="date-block"><span>{dueLabel(u.assignment.due).slice(0, 3)}</span><b>{u.assignment.due.slice(8)}</b></div>
                <div className="due-main">
                  <div className="due-title">{u.assignment.title}</div>
                  <div className="due-sub"><Users size={13} /> {u.notStarted} not started · {u.assignment.concept}</div>
                  {u.atRisk > 0 && <div className="due-warn">{u.atRisk} at-risk students are weakest in {u.assignment.concept}</div>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Roster rows={courseEnrollments(courseId)} title={`${course.code} roster`} />
    </div>
  );
}
