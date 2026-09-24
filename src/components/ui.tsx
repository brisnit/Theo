import { ArrowDownRight, ArrowUpRight, ChevronLeft, ExternalLink, Minus, RefreshCw, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import type { StudentStatus } from '../data/insights';
import { riskLabel } from '../data/insights';
import type { Course, Risk } from '../data/types';
import { Link } from '../lib/router';
import { useApp } from '../state/AppState';

export function Wordmark({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <span className={`wordmark wordmark-${size}`}>
      <svg viewBox="0 0 28 28" className="wordmark-mark" aria-hidden>
        <rect width="28" height="28" rx="8" fill="#070816" />
        <path d="M6 18.5 L11 14.5 L15 16.5 L20.5 9.5" fill="none" stroke="#90A7E8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="21" cy="9" r="2.6" fill="#3159DC" stroke="#fff" strokeWidth="1.2" />
      </svg>
      THEO
    </span>
  );
}

export function Card({ title, eyebrow, action, children, className = '', id }: {
  title?: ReactNode;
  eyebrow?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section className={`card ${className}`} id={id}>
      {(title || action || eyebrow) && (
        <header className="card-head">
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            {title && <h3 className="card-title">{title}</h3>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function InsightCard({ children, title = 'Theo Insight', actions, meta, className = '' }: {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card insight ${className}`}>
      <div className="insight-head">
        <span className="insight-label"><Sparkles size={15} /> {title}</span>
        {meta}
      </div>
      <div className="insight-body">{children}</div>
      {actions && <div className="insight-actions">{actions}</div>}
    </section>
  );
}

export function Stat({ label, value, sub, tone, size = 'md' }: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'high' | 'watch' | 'ok' | 'blue';
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <div className={`stat stat-${size}`}>
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${tone ? `tone-${tone}` : ''}`}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function Delta({ value, suffix = '%', className = '' }: { value: number; suffix?: string; className?: string }) {
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  return (
    <span className={`delta ${value > 0 ? 'up' : value < 0 ? 'down' : 'flat'} ${className}`}>
      <Icon size={16} strokeWidth={2.4} />
      {Math.abs(value)}{suffix}
    </span>
  );
}

export function RiskBadge({ risk, label }: { risk: Risk; label?: string }) {
  return <span className={`badge risk-${risk}`}><i />{label ?? riskLabel(risk)}</span>;
}

const statusTone: Record<StudentStatus, string> = {
  'Needs Attention': 'risk-high',
  'Trending Down': 'risk-moderate',
  'Getting Stronger': 'status-strong',
  'On Track': 'risk-low',
};

export function StatusPill({ status }: { status: StudentStatus }) {
  return <span className={`badge ${statusTone[status]}`}><i />{status}</span>;
}

const AVATAR_TONES = ['#DDE5FA', '#E7EAF2', '#E4EAFB', '#ECEFF6', '#D9E1F7'];

export function Avatar({ initials, size = 36, dark = false }: { initials: string; size?: number; dark?: boolean }) {
  const tone = AVATAR_TONES[(initials.charCodeAt(0) + initials.charCodeAt(1)) % AVATAR_TONES.length];
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.36, background: dark ? '#070816' : tone, color: dark ? '#fff' : '#070816' }}
    >
      {initials}
    </span>
  );
}

export function CanvasSync({ label = 'Synced with Canvas', detail = '4 min ago' }: { label?: string; detail?: string }) {
  return (
    <span className="canvas-sync" title="Courses, assignments, grades and activity sync from Canvas">
      <span className="pulse" />
      {label}
      {detail && <span className="muted">· {detail}</span>}
      <RefreshCw size={12} />
    </span>
  );
}

export function CanvasButton({ what, label = 'Open in Canvas', variant = 'ghost', small = false }: {
  what: string;
  label?: string;
  variant?: 'ghost' | 'quiet' | 'light';
  small?: boolean;
}) {
  const { toast } = useApp();
  return (
    <button className={`btn btn-${variant} ${small ? 'btn-sm' : ''}`} onClick={() => toast(`Opening ${what} in Canvas…`)}>
      {label} <ExternalLink size={14} />
    </button>
  );
}

export function CourseChip({ course }: { course: Pick<Course, 'code' | 'color'> }) {
  return <span className="course-chip"><i style={{ background: course.color }} />{course.code}</span>;
}

export function Segmented<T extends string>({ options, value, onChange, size = 'md' }: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div className={`segmented segmented-${size}`} role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={o.value === value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, actions, back }: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: { to: string; label: string };
}) {
  return (
    <div className="page-header">
      <div className="page-header-text">
        {back && <Link className="back-link" to={back.to}><ChevronLeft size={16} />{back.label}</Link>}
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}
