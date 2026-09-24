import { ArrowRight } from 'lucide-react';
import { Card, CourseChip, PageHeader, RiskBadge, Stat } from '../../components/ui';
import { fmtDate } from '../../data/calendar';
import {
  getCourse, getStudent, impactSummary, professorEnrollments, professorInterventions, riskShort,
} from '../../data/insights';
import { enrollments } from '../../data/mock';
import { DEMO_PROFESSOR } from '../../data/mock';
import { Link } from '../../lib/router';
import { useApp } from '../../state/AppState';

export function ImpactPage() {
  const { addedInterventions } = useApp();
  const list = [...addedInterventions, ...professorInterventions(DEMO_PROFESSOR)];
  const impact = impactSummary(list);
  const flagged = professorEnrollments(DEMO_PROFESSOR).filter((e) => e.risk !== 'low').length;

  const byType = [
    { label: 'Targeted review or practice', match: /review|practice|resource/i },
    { label: 'Check-in message', match: /check-in/i },
  ].map((t) => {
    const items = list.filter((i) => t.match.test(i.title) && i.status !== 'measuring');
    const improved = items.filter((i) => i.status === 'improved').length;
    return { ...t, total: items.length, rate: items.length ? Math.round((improved / items.length) * 100) : 0 };
  });

  const loop = [
    { step: 'Predict', value: flagged, text: 'students flagged from Canvas signals' },
    { step: 'Personalize', value: flagged, text: 'recommendations tailored to each student' },
    { step: 'Intervene', value: list.length, text: 'interventions this term' },
    { step: 'Prove', value: `${impact.rate}%`, text: 'improved a student’s trajectory' },
  ];

  return (
    <div className="page">
      <PageHeader
        eyebrow="Prove"
        title="Intervention impact"
        subtitle="Theo doesn't only raise alarms. It measures whether what you did actually changed a student's trajectory."
      />

      <div className="loop-strip">
        {loop.map((l, i) => (
          <div key={l.step} className="loop-step">
            <span className="loop-name">{i + 1}. {l.step}</span>
            <b>{l.value}</b>
            <span className="muted small">{l.text}</span>
          </div>
        ))}
      </div>

      <div className="grid-12">
        <Card className="span-3"><Stat label="Improved outcomes" value={`${impact.rate}%`} tone="blue" sub={`${impact.improved} of ${impact.total - impact.measuring} measured`} /></Card>
        <Card className="span-3"><Stat label="Avg. mastery gain" value={`+${impact.avgGain}`} sub="After a targeted review" /></Card>
        <Card className="span-3"><Stat label="Lower risk" value={impact.lowered} sub="Students moved down a risk level" /></Card>
        <Card className="span-3"><Stat label="Measuring now" value={impact.measuring} sub="Results within 7 days" /></Card>
      </div>

      <div className="grid-12">
        <Card className="span-4" eyebrow="What works" title="Success rate by intervention">
          <div className="mastery-bars">
            {byType.map((t) => (
              <div key={t.label} className="mbar">
                <div className="mbar-top"><span className="mbar-label">{t.label}</span><span className="mbar-value">{t.rate}%</span></div>
                <div className="mbar-track"><div className="mbar-fill" style={{ width: `${t.rate}%`, background: '#3159DC' }} /></div>
                <div className="mbar-note">{t.total} measured</div>
              </div>
            ))}
          </div>
          <p className="fine">Targeted, concept-specific reviews outperform general check-ins for students with a mastery signal.</p>
        </Card>

        <Card className="span-8" eyebrow="History" title="All interventions">
          <div className="iv-table">
            {list.map((iv) => {
              const e = enrollments.find((x) => x.id === iv.enrollmentId)!;
              const s = getStudent(e.studentId)!;
              return (
                <Link key={iv.id} to={`/professor/course/${e.courseId}/student/${e.studentId}`} className="iv-row">
                  <div className="iv-who">
                    <b>{s.name}</b>
                    <span><CourseChip course={getCourse(e.courseId)!} /> {iv.title}</span>
                  </div>
                  <div className="iv-when muted small">{fmtDate(iv.steps[0].date)}</div>
                  <div className="iv-result">
                    {iv.masteryFrom !== undefined && <span className="small">{iv.masteryFrom}% → <b>{iv.masteryTo}%</b></span>}
                    {iv.status === 'improved' && iv.riskFrom !== iv.riskTo && (
                      <span className="iv-risk"><RiskBadge risk={iv.riskFrom!} label={riskShort(iv.riskFrom!)} /><ArrowRight size={12} /><RiskBadge risk={iv.riskTo!} label={riskShort(iv.riskTo!)} /></span>
                    )}
                  </div>
                  <span className={`badge iv-${iv.status}`}><i />{iv.status === 'improved' ? 'Improved' : iv.status === 'measuring' ? 'Measuring' : 'No change'}</span>
                </Link>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
