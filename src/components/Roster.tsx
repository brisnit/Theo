import { ChevronDown, ChevronRight, ChevronUp, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getCourse, getStudent, weakest } from '../data/insights';
import { C } from '../data/palette';
import type { Enrollment, Risk } from '../data/types';
import { navigate } from '../lib/router';
import { Sparkline } from './charts';
import { Avatar, Card, CourseChip, Delta, RiskBadge } from './ui';

type Filter = 'all' | Risk;
type SortKey = 'name' | 'course' | 'current' | 'predicted' | 'engagement' | 'risk';

const RISK_RANK: Record<Risk, number> = { high: 0, moderate: 1, low: 2 };

export function Roster({ rows, showCourse = false, title = 'Roster' }: { rows: Enrollment[]; showCourse?: boolean; title?: string }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'risk', dir: 1 });

  const counts = {
    all: rows.length,
    low: rows.filter((r) => r.risk === 'low').length,
    moderate: rows.filter((r) => r.risk === 'moderate').length,
    high: rows.filter((r) => r.risk === 'high').length,
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const value = (e: Enrollment): string | number => {
      switch (sort.key) {
        case 'name': return getStudent(e.studentId)!.name.split(' ').slice(-1)[0];
        case 'course': return getCourse(e.courseId)!.code;
        case 'current': return e.current;
        case 'predicted': return e.predicted;
        case 'engagement': return e.engagementChange;
        case 'risk': return RISK_RANK[e.risk] * 100 + (e.predicted - e.current);
      }
    };
    return rows
      .filter((e) => filter === 'all' || e.risk === filter)
      .filter((e) => !q || getStudent(e.studentId)!.name.toLowerCase().includes(q) || getCourse(e.courseId)!.code.toLowerCase().includes(q))
      .sort((a, b) => {
        const va = value(a);
        const vb = value(b);
        return (typeof va === 'string' ? va.localeCompare(vb as string) : va - (vb as number)) * sort.dir;
      });
  }, [rows, query, filter, sort]);

  const header = (key: SortKey, label: string, className = '') => (
    <th className={className}>
      <button
        className={`th-btn ${sort.key === key ? 'on' : ''}`}
        onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === 'name' || key === 'course' || key === 'risk' ? 1 : -1 }))}
      >
        {label}
        {sort.key === key && (sort.dir === 1 ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
      </button>
    </th>
  );

  const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'low', label: 'On Track' },
    { value: 'moderate', label: 'Watch' },
    { value: 'high', label: 'High Risk' },
  ];

  return (
    <Card
      title={title}
      className="roster"
      action={(
        <label className="search">
          <Search size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search students" />
        </label>
      )}
    >
      <div className="filter-row">
        {filters.map((f) => (
          <button key={f.value} className={`chip ${filter === f.value ? 'chip-on' : ''}`} onClick={() => setFilter(f.value)}>
            {f.label} <span className="chip-count">{counts[f.value]}</span>
          </button>
        ))}
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {header('name', 'Student')}
              {showCourse && header('course', 'Course')}
              {header('current', 'Current', 'num')}
              {header('predicted', 'Predicted', 'num')}
              <th className="hide-sm">Trajectory</th>
              {header('engagement', 'Engagement (14d)')}
              <th className="hide-sm">Focus concept</th>
              {header('risk', 'Status')}
              <th aria-label="Open" />
            </tr>
          </thead>
          <tbody>
            {visible.map((e) => {
              const s = getStudent(e.studentId)!;
              const course = getCourse(e.courseId)!;
              const w = weakest(e);
              return (
                <tr key={e.id} onClick={() => navigate(`/professor/course/${e.courseId}/student/${e.studentId}`)} tabIndex={0}
                  onKeyDown={(ev) => ev.key === 'Enter' && navigate(`/professor/course/${e.courseId}/student/${e.studentId}`)}>
                  <td>
                    <div className="person">
                      <Avatar initials={s.initials} size={34} />
                      <div>
                        <div className="person-name">{s.name}</div>
                        <div className="person-sub">{s.year} · Active {e.lastActive.toLowerCase()}</div>
                      </div>
                    </div>
                  </td>
                  {showCourse && <td><CourseChip course={course} /></td>}
                  <td className="num strong">{e.current}%</td>
                  <td className={`num strong ${e.predicted < e.current - 3 ? 'tone-watch' : ''}`}>{e.predicted}%</td>
                  <td className="hide-sm spark-cell">
                    <Sparkline data={e.grades} projected={[e.current, e.predicted]} height={30} color={e.risk === 'high' ? C.high : e.risk === 'moderate' ? C.watch : C.blue} />
                  </td>
                  <td><span className="eng-cell">{e.engagement[7]}% <Delta value={e.engagementChange} /></span></td>
                  <td className="hide-sm"><span className={w.value < 70 ? 'concept-weak' : 'muted'}>{w.concept} · {w.value}%</span></td>
                  <td><RiskBadge risk={e.risk} /></td>
                  <td className="chev"><ChevronRight size={16} /></td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr className="empty-row"><td colSpan={9}>No students match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
