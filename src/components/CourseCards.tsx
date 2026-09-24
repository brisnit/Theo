import { ArrowUpRight, CalendarClock, Target, TrendingDown, TrendingUp, MoveRight } from 'lucide-react';
import { dueLabel } from '../data/calendar';
import {
  courseStats, getCourse, getProfessor, strongest, studentStatus, upcomingAssignments, weakest,
} from '../data/insights';
import { C } from '../data/palette';
import type { Course, Enrollment } from '../data/types';
import { Link } from '../lib/router';
import { RiskBar, Sparkline } from './charts';
import { CourseChip, Delta, StatusPill } from './ui';

export function ProfessorCourseCard({ course }: { course: Course }) {
  const st = courseStats(course.id);
  return (
    <Link to={`/professor/course/${course.id}`} className="card course-card">
      <div className="cc-head">
        <div>
          <CourseChip course={course} />
          <h3 className="cc-title">{course.title}</h3>
          <div className="cc-sub">{st.size} Students · {course.schedule}</div>
        </div>
        <span className="icon-circle"><ArrowUpRight size={18} /></span>
      </div>

      <div className="cc-numbers">
        <div className="stat stat-md">
          <div className="stat-label">Current Average</div>
          <div className="stat-value">{st.current}%</div>
        </div>
        <div className="stat stat-md">
          <div className="stat-label">Predicted Final</div>
          <div className={`stat-value ${st.predicted < st.current - 1 ? 'tone-watch' : 'tone-blue'}`}>{st.predicted}%</div>
        </div>
        <div className="cc-chart">
          <Sparkline data={st.gradeTrend} projected={st.projection} height={58} />
        </div>
      </div>

      <div className="cc-risk">
        <RiskBar onTrack={st.onTrack} watch={st.watch} high={st.high} />
        <div className="cc-risk-legend">
          <span><b>{st.onTrack}</b> On Track</span>
          <span><i className="dot watch" /><b>{st.watch}</b> Needs Attention</span>
          <span><i className="dot high" /><b>{st.high}</b> High Risk</span>
        </div>
      </div>

      <div className="cc-foot">
        <div className="cc-foot-item">
          <span className="stat-label">Engagement</span>
          <b>{st.engagement}%</b>
          <div className="cc-mini"><Sparkline data={st.engagementTrend} height={26} color={C.peri} /></div>
        </div>
        <div className="cc-foot-item">
          <span className="stat-label">Momentum</span>
          <Delta value={st.momentum} />
        </div>
      </div>
    </Link>
  );
}

export function StudentCourseCard({ enrollment: e }: { enrollment: Enrollment }) {
  const course = getCourse(e.courseId)!;
  const status = studentStatus(e);
  const next = upcomingAssignments(course)[0];
  const attention = status === 'Needs Attention' || status === 'Trending Down';
  const MomentumIcon = e.momentum >= 3 ? TrendingUp : e.momentum <= -3 ? TrendingDown : MoveRight;

  return (
    <Link to={`/student/course/${course.id}`} className={`card course-card student ${attention ? 'needs' : ''}`}>
      <div className="cc-head">
        <div>
          <CourseChip course={course} />
          <h3 className="cc-title">{course.title}</h3>
          <div className="cc-sub">{getProfessor(course.professorId).name}</div>
        </div>
        <StatusPill status={status} />
      </div>

      <div className="cc-numbers three">
        <div className="stat stat-md">
          <div className="stat-label">Current Grade</div>
          <div className="stat-value">{e.current}%</div>
        </div>
        <div className="stat stat-md">
          <div className="stat-label">Predicted</div>
          <div className={`stat-value ${e.predicted < e.current - 1 ? 'tone-watch' : 'tone-blue'}`}>{e.predicted}%</div>
        </div>
        <div className="stat stat-md">
          <div className="stat-label">Momentum</div>
          <div className={`stat-value momentum ${e.momentum >= 3 ? 'tone-ok' : e.momentum <= -3 ? 'tone-watch' : ''}`}>
            <MomentumIcon size={28} strokeWidth={2.4} />
          </div>
        </div>
      </div>

      <Sparkline
        data={e.grades}
        projected={[e.current, (e.current + e.predicted) / 2, e.predicted]}
        height={48}
        color={attention ? C.watch : C.blue}
      />

      <div className="cc-student-foot">
        {next && (
          <div className="cc-line">
            <CalendarClock size={16} />
            <span><span className="muted">Next:</span> {next.title.replace(/:.*/, '')} — {dueLabel(next.due)}</span>
          </div>
        )}
        <div className={`cc-line ${attention ? 'attention' : 'good'}`}>
          <Target size={16} />
          {attention
            ? <span><span className="muted">Needs attention:</span> {weakest(e).concept}</span>
            : <span><span className="muted">{status === 'Getting Stronger' ? 'Getting stronger in' : 'Strongest area:'}</span> {strongest(e).concept}</span>}
        </div>
      </div>
    </Link>
  );
}
