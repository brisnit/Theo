import { CheckCircle2, ExternalLink, ListChecks, PlayCircle, X } from 'lucide-react';
import { enrollments } from '../data/mock';
import { getCourse, weakest } from '../data/insights';
import { useApp } from '../state/AppState';

const STEPS: Record<string, [string, string][]> = {
  'Theological Argument': [
    ['Watch: Descriptive vs. constructive theological claims', '4 min'],
    ['Practice: Revise three doctrinal thesis statements', '8 min'],
    ['Check yourself: 3-question self-check', '3 min'],
  ],
};

export function ReviewModal() {
  const { review, openReview, toggleTask, toast } = useApp();
  if (!review) return null;
  const e = enrollments.find((x) => x.id === review)!;
  const course = getCourse(e.courseId)!;
  const concept = weakest(e).concept;
  const steps = STEPS[concept] ?? [
    [`Watch: Key ideas in ${concept}`, '4 min'],
    [`Practice: Three short ${concept} exercises`, '8 min'],
    ['Check yourself: 3-question self-check', '3 min'],
  ];
  const icons = [PlayCircle, ListChecks, CheckCircle2];

  return (
    <div className="modal-scrim" onClick={() => openReview(null)}>
      <div className="modal" role="dialog" aria-modal onClick={(ev) => ev.stopPropagation()}>
        <button className="icon-btn modal-close" onClick={() => openReview(null)} aria-label="Close"><X size={18} /></button>
        <div className="eyebrow">{course.code} · 15 minute review</div>
        <h2>{concept}</h2>
        <p className="muted">
          Theo picked these from your {course.code} modules in Canvas because they target exactly what changed.
          Students who completed this review typically saw their practice scores rise within a week.
        </p>
        <ol className="review-steps">
          {steps.map(([title, time], i) => {
            const Icon = icons[i];
            return (
              <li key={title}>
                <Icon size={20} />
                <span>{title}</span>
                <em>{time}</em>
              </li>
            );
          })}
        </ol>
        <div className="modal-actions">
          <button className="btn btn-quiet" onClick={() => openReview(null)}>Maybe later</button>
          <button
            className="btn btn-primary"
            onClick={() => {
              toggleTask(`review:${e.id}`, true);
              openReview(null);
              toast(`Opening the ${concept} review in Canvas. Nice — this is your highest-impact step today.`, 'success');
            }}
          >
            Start in Canvas <ExternalLink size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
