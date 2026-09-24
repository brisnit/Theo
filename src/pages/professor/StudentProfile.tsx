import { AlertTriangle, ArrowRight, CheckCircle2, CircleCheck, Clock, MessageSquare, Sparkles, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Columns, MasteryBars, Sparkline, TrendChart } from '../../components/charts';
import { Avatar, CanvasButton, Card, Delta, PageHeader, RiskBadge } from '../../components/ui';
import { TODAY_ISO, WEEK_LABELS, dueLabel, fmtDate, parseDate } from '../../data/calendar';
import {
  enrollmentInterventions, getCourse, getEnrollment, getStudent, pastAssignments, professorEnrollments, projection,
  recommendation, riskLabel, riskShort, signals, studentStatus, upcomingAssignments,
} from '../../data/insights';
import { DEMO_PROFESSOR } from '../../data/mock';
import { C } from '../../data/palette';
import type { Intervention } from '../../data/types';
import { Link } from '../../lib/router';
import { useApp } from '../../state/AppState';

const addDays = (iso: string, days: number) => {
  const d = parseDate(iso);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function StudentProfile({ courseId, studentId }: { courseId: string; studentId: string }) {
  const { actions, recordAction, ensureThread, openChat, toast, addedInterventions } = useApp();
  const [dismissing, setDismissing] = useState(false);
  const e = getEnrollment(courseId, studentId)!;
  const s = getStudent(studentId)!;
  const course = getCourse(courseId)!;
  const rec = recommendation(e);
  const why = signals(e);
  const action = actions[e.id];
  const history = [...addedInterventions.filter((i) => i.enrollmentId === e.id), ...enrollmentInterventions(e.id)];
  const others = professorEnrollments(DEMO_PROFESSOR).filter((x) => x.studentId === studentId && x.courseId !== courseId);
  const atRisk = e.risk !== 'low';

  const proj = projection(e.current, e.predicted);
  const recovered = projection(e.current, Math.round(e.predicted + (e.current - e.predicted) * 0.7));
  const nulls = (n: number) => Array(n).fill(null);

  const past = pastAssignments(course);
  const upcoming = upcomingAssignments(course);
  const late = e.submissions.filter((x) => x.status === 'late').length;
  const missing = e.submissions.filter((x) => x.status === 'missing').length;
  const composite = e.grades.map((g, i) => Math.round((g + e.engagement[i]) / 2));

  const draft = rec.action === 'meeting'
    ? `Hi ${s.first}, I'd love to catch up about ${course.code}. Could you stop by office hours this Thursday between 2 and 4? Even 10 minutes would help us make a plan.`
    : rec.action === 'encourage'
      ? `Hi ${s.first}, I wanted to say your work in ${course.code} has been getting stronger every week. Keep it up!`
      : `Hi ${s.first}, I noticed the last couple of weeks have been busy. I've added a short ${rec.concept} review (about 15 minutes) to your Canvas modules — it should help with what's coming up. Want to check in during office hours Thursday?`;

  const startMessage = () => {
    const threadId = ensureThread(DEMO_PROFESSOR, studentId, courseId);
    openChat(threadId, 'professor', draft);
    if (!action) {
      recordAction(e.id, { kind: 'messaged', date: TODAY_ISO }, measuring(`Check-in message`, `You opened a check-in with ${s.first}`));
    }
  };

  const measuring = (title: string, text: string): Intervention => ({
    id: `new-${e.id}-${Date.now()}`, enrollmentId: e.id, title, status: 'measuring', concept: rec.concept, riskFrom: e.risk,
    steps: [
      { date: TODAY_ISO, kind: 'action', text },
      { date: addDays(TODAY_ISO, 7), kind: 'pending', text: `Theo is measuring impact — results expected ${fmtDate(addDays(TODAY_ISO, 7))}` },
    ],
  });

  const assignReview = () => {
    recordAction(e.id, { kind: 'assigned', date: TODAY_ISO }, measuring(`${rec.concept} review`, `You assigned a ${rec.concept} review in Canvas`));
    toast(`${rec.concept} review assigned to ${s.first} in Canvas`, 'success');
  };

  const dismiss = (reason: string) => {
    recordAction(e.id, { kind: 'dismissed', date: TODAY_ISO, note: reason });
    setDismissing(false);
    toast('Recommendation dismissed. Theo will use your feedback to improve future suggestions.');
  };

  return (
    <div className="page">
      <PageHeader back={{ to: `/professor/course/${courseId}`, label: course.code }} title="" />

      <section className="card profile-hero">
        <div className="profile-id">
          <Avatar initials={s.initials} size={68} />
          <div>
            <h1>{s.name}</h1>
            <div className="profile-course">{course.code} — {course.title}</div>
            <div className="muted small">{s.year} · {s.major} · Last active in Canvas {e.lastActive.toLowerCase()}</div>
            {others.length > 0 && (
              <div className="profile-also">
                Also in your{' '}
                {others.map((o) => (
                  <Link key={o.id} to={`/professor/course/${o.courseId}/student/${studentId}`} className="chip chip-link">
                    {getCourse(o.courseId)!.code} · {riskLabel(o.risk)}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="profile-stats">
          <div><span className="stat-label">Current</span><b>{e.current}%</b></div>
          <div><span className="stat-label">Predicted</span><b className={atRisk ? (e.risk === 'high' ? 'tone-high' : 'tone-watch') : 'tone-blue'}>{e.predicted}%</b></div>
          <div><span className="stat-label">Risk</span><b className={`risk-word risk-text-${e.risk}`}>{riskShort(e.risk).toUpperCase()}</b></div>
        </div>
        <div className="profile-actions">
          <button className="btn btn-dark" onClick={startMessage}><MessageSquare size={16} /> Message</button>
          <CanvasButton what={`${s.first}'s ${course.code} grades`} />
        </div>
      </section>

      <div className="grid-12">
        <Card className="span-5" eyebrow="Explainable prediction" title={atRisk ? 'Why Theo flagged this student' : `Why ${s.first} looks on track`}>
          <ul className="why-list">
            {why.map((w) => (
              <li key={w} className={atRisk ? '' : 'good'}>
                {atRisk ? <AlertTriangle size={16} /> : <CircleCheck size={16} />}
                {w}
              </li>
            ))}
          </ul>
          <p className="fine">Based on 8 weeks of Canvas grades, submissions, assessment results and course activity.</p>
        </Card>

        <Card className={`span-7 rec-card ${atRisk ? 'rec-urgent' : ''}`} eyebrow={<><Sparkles size={13} /> Recommended intervention</>} title={undefined}>
          {!action && (
            <>
              <p className="rec-title">“{rec.title}”</p>
              <p className="rec-detail">{rec.detail}</p>
              <div className="rec-meta">
                <span className="badge"><Clock size={13} /> {rec.urgency}</span>
                {atRisk && <span className="badge">Targets {rec.concept}</span>}
              </div>
              {!dismissing ? (
                <div className="rec-actions">
                  {rec.action !== 'none' && (
                    <button className="btn btn-primary" onClick={startMessage}>
                      <MessageSquare size={16} /> {rec.action === 'meeting' ? 'Send Invitation' : rec.action === 'encourage' ? 'Send Encouragement' : 'Send Message'}
                    </button>
                  )}
                  {atRisk && <button className="btn btn-ghost" onClick={assignReview}>Assign Review</button>}
                  {rec.action !== 'none' && <button className="btn btn-quiet" onClick={() => setDismissing(true)}>Dismiss Recommendation</button>}
                </div>
              ) : (
                <div className="dismiss-box">
                  <span className="muted small">Why are you dismissing this?</span>
                  <div className="rec-actions">
                    {['Already handled', 'Not relevant', 'Remind me next week'].map((r) => (
                      <button key={r} className="chip" onClick={() => dismiss(r)}>{r}</button>
                    ))}
                    <button className="btn btn-quiet btn-sm" onClick={() => setDismissing(false)}>Cancel</button>
                  </div>
                </div>
              )}
            </>
          )}
          {action && action.kind !== 'dismissed' && (
            <div className="rec-done">
              <CheckCircle2 size={28} />
              <div>
                <p className="rec-title">{action.kind === 'assigned' ? `${rec.concept} review assigned` : 'Conversation started'}</p>
                <p className="rec-detail">Theo will watch {s.first}'s Canvas activity and {rec.concept} mastery over the next 7 days and report whether this changed the trajectory.</p>
                {action.kind === 'messaged' && <button className="btn btn-ghost btn-sm" onClick={assignReview}>Also assign review</button>}
              </div>
            </div>
          )}
          {action?.kind === 'dismissed' && (
            <div className="rec-done muted-done">
              <XCircle size={26} />
              <div>
                <p className="rec-title">Recommendation dismissed</p>
                <p className="rec-detail">Reason: {action.note}. Theo will keep monitoring and suggest again if the trajectory worsens.</p>
              </div>
            </div>
          )}
        </Card>

        <Card className="span-7" eyebrow="Predict" title="Predicted outcome" action={<span className="legend-note"><i className="solid" /> Actual <i className="dashed" /> If nothing changes {atRisk && <><i className="dashed peri" /> With intervention</>}</span>}>
          <TrendChart
            height={250}
            labels={WEEK_LABELS}
            legend={false}
            marker={{ index: 7, label: 'Today' }}
            series={[
              { label: 'Grade', data: [...e.grades, ...nulls(8)], color: C.blue, area: true },
              { label: 'If nothing changes', data: [...nulls(7), ...proj], color: atRisk ? C.high : C.blue, dashed: true },
              ...(atRisk ? [{ label: 'With intervention', data: [...nulls(7), ...recovered], color: C.peri, dashed: true }] : []),
            ]}
            band={{ lo: [...nulls(7), ...proj.map((v, i) => v - (e.band * i) / 8)], hi: [...nulls(7), ...proj.map((v, i) => v + (e.band * i) / 8)], color: atRisk ? C.high : C.peri }}
          />
          <div className="outcome-row">
            <div><span className="stat-label">Today</span><b>{e.current}%</b></div>
            <ArrowRight size={16} className="muted" />
            <div><span className="stat-label">If nothing changes</span><b className={atRisk ? 'tone-high' : 'tone-blue'}>{e.predicted}%</b><span className="muted small"> ±{e.band}</span></div>
            {atRisk && <div><span className="stat-label">With intervention</span><b className="tone-blue">{recovered.at(-1)!.toFixed(0)}%</b></div>}
          </div>
        </Card>

        <Card className="span-5" eyebrow="Learning momentum" title="Current trajectory">
          <div className="momentum-head">
            <Delta value={e.momentum} className="delta-xl" />
            <span className="muted">{e.momentum <= -5 ? 'Slipping over the last two weeks' : e.momentum >= 5 ? 'Building week over week' : 'Holding steady'}</span>
          </div>
          <Sparkline data={composite} height={96} color={e.momentum < 0 ? C.watch : C.blue} />
          <div className="axis-row"><span>W1</span><span>W4</span><span>W8 · Today</span></div>
          <p className="fine">Combines weekly grade performance and Canvas engagement relative to {s.first}'s own baseline.</p>
        </Card>

        <Card className="span-4" eyebrow="Canvas activity" title="Engagement">
          <div className="big-line">
            <b>{e.engagement[7]}%</b>
            <Delta value={e.engagementChange} />
            <span className="muted small">in 14 days</span>
          </div>
          <Columns values={e.visits} labels={WEEK_LABELS.slice(0, 8)} baseline={e.baselineVisits} height={120} highlightLast={false} />
          <div className="facts">
            <div><span>Sessions this week</span><b>{e.visits[7]} <em>usual {e.baselineVisits}</em></b></div>
            <div><span>Participation</span><b>{e.participation}%</b></div>
            <div><span>Completion</span><b>{e.completion}%</b></div>
          </div>
        </Card>

        <Card className="span-4" eyebrow="Mastery signals" title="Mastery">
          <MasteryBars items={e.mastery} />
          <p className="fine">Tick marks show mastery two weeks ago.</p>
        </Card>

        <Card className="span-4" eyebrow="From Canvas" title="Assignments">
          <div className="assign-counts">
            <div><b>{upcoming.length}</b><span>Upcoming</span></div>
            <div><b>{e.submissions.length - missing}</b><span>Completed</span></div>
            <div><b className={late ? 'tone-watch' : ''}>{late}</b><span>Late</span></div>
            <div><b className={missing ? 'tone-high' : ''}>{missing}</b><span>Missing</span></div>
          </div>
          <div className="assign-list">
            {upcoming.slice(0, 2).map((a) => (
              <div key={a.id} className="assign-row">
                <span className="assign-title">{a.title}</span>
                <span className="badge">Due {dueLabel(a.due)}</span>
              </div>
            ))}
            {[...past].reverse().slice(0, 4).map((a) => {
              const sub = e.submissions.find((x) => x.assignmentId === a.id)!;
              return (
                <div key={a.id} className="assign-row">
                  <span className="assign-title">{a.title}</span>
                  <span className={`badge sub-${sub.status}`}>
                    {sub.status === 'missing' ? 'Missing' : `${sub.status === 'late' ? 'Late · ' : ''}${sub.score}%`}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="span-7" eyebrow="Prove" title="Intervention history">
          {history.length === 0 ? (
            <p className="muted">No interventions yet. When you act on a recommendation, Theo tracks whether it changed {s.first}'s trajectory.</p>
          ) : (
            <div className="history">
              {history.map((iv) => (
                <div key={iv.id} className="history-item">
                  <div className="history-head">
                    <b>{iv.title}</b>
                    <span className={`badge iv-${iv.status}`}><i />{iv.status === 'improved' ? 'Improved' : iv.status === 'measuring' ? 'Measuring' : 'No change'}</span>
                  </div>
                  <ol className="timeline">
                    {iv.steps.map((step) => (
                      <li key={step.text} className={`tl-${step.kind}`}>
                        <span className="tl-date">{fmtDate(step.date)}</span>
                        <span className="tl-text">{step.text}</span>
                      </li>
                    ))}
                  </ol>
                  {iv.status === 'improved' && iv.riskFrom !== iv.riskTo && (
                    <div className="history-result">
                      Risk decreased <RiskBadge risk={iv.riskFrom!} label={riskShort(iv.riskFrom!).toUpperCase()} /> <ArrowRight size={14} /> <RiskBadge risk={iv.riskTo!} label={riskShort(iv.riskTo!).toUpperCase()} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="span-5" eyebrow="Canvas activity" title="Recent activity">
          <ol className="activity-feed">
            <li><span className="feed-dot" /><div><b>Last Canvas session</b><span className="muted small">{e.lastActive}</span></div></li>
            {[...past].reverse().slice(0, 4).map((a) => {
              const sub = e.submissions.find((x) => x.assignmentId === a.id)!;
              return (
                <li key={a.id}>
                  <span className={`feed-dot ${sub.status}`} />
                  <div>
                    <b>{sub.status === 'missing' ? `Did not submit ${a.title}` : `Submitted ${a.title}`}</b>
                    <span className="muted small">
                      {sub.status === 'late' ? `${fmtDate(addDays(a.due, 2))} · 2 days late` : sub.status === 'missing' ? `Due ${fmtDate(a.due)}` : fmtDate(a.due)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="profile-status-note">Student view shows: <b>{studentStatus(e)}</b></div>
        </Card>
      </div>
    </div>
  );
}
