import { TODAY_ISO, dueLabel } from './calendar';
import { courses, enrollments, interventions, professors, students } from './mock';
import type { Assignment, Course, Enrollment, Intervention, Risk } from './types';

/* ---------- lookups ---------- */

export const getCourse = (id: string) => courses.find((c) => c.id === id);
export const getStudent = (id: string) => students.find((s) => s.id === id);
export const getProfessor = (id: string) => professors.find((p) => p.id === id)!;
export const getEnrollment = (courseId: string, studentId: string) =>
  enrollments.find((e) => e.courseId === courseId && e.studentId === studentId);
export const courseEnrollments = (courseId: string) => enrollments.filter((e) => e.courseId === courseId);
export const studentEnrollments = (studentId: string) => enrollments.filter((e) => e.studentId === studentId);
export const professorCourses = (professorId: string) => courses.filter((c) => c.professorId === professorId);
export const professorEnrollments = (professorId: string) => {
  const ids = professorCourses(professorId).map((c) => c.id);
  return enrollments.filter((e) => ids.includes(e.courseId));
};
export const enrollmentInterventions = (enrollmentId: string) => interventions.filter((i) => i.enrollmentId === enrollmentId);

export const avg = (xs: number[]) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0);
export const pastAssignments = (c: Course) => c.assignments.filter((a) => a.due <= TODAY_ISO);
export const upcomingAssignments = (c: Course) => c.assignments.filter((a) => a.due > TODAY_ISO);

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
export const word = (n: number) => WORDS[n] ?? String(n);

/* ---------- labels ---------- */

export const riskLabel = (r: Risk) => (r === 'high' ? 'High Risk' : r === 'moderate' ? 'Watch' : 'On Track');
export const riskShort = (r: Risk) => (r === 'high' ? 'High' : r === 'moderate' ? 'Moderate' : 'Low');

export type StudentStatus = 'Needs Attention' | 'Trending Down' | 'Getting Stronger' | 'On Track';

/** Student-facing language: never probabilities, always something understandable. */
export function studentStatus(e: Enrollment): StudentStatus {
  if (e.risk === 'high') return 'Needs Attention';
  if (e.risk === 'moderate') return 'Trending Down';
  if (e.momentum >= 8 || e.predicted - e.current >= 3) return 'Getting Stronger';
  return 'On Track';
}

export const weakest = (e: Enrollment) => [...e.mastery].sort((a, b) => a.value - b.value)[0];
export const strongest = (e: Enrollment) => [...e.mastery].sort((a, b) => b.value - a.value)[0];

/** Weekly values from now (week 8) to the end of term (week 16), easing toward the prediction. */
export function projection(current: number, predicted: number): number[] {
  return Array.from({ length: 9 }, (_, i) => {
    const t = i / 8;
    return Math.round((current + (predicted - current) * (1 - (1 - t) ** 2)) * 10) / 10;
  });
}

/* ---------- why a student was flagged ---------- */

export function signals(e: Enrollment): string[] {
  const course = getCourse(e.courseId)!;
  const out: string[] = [];
  if (e.risk === 'low') {
    const late = e.submissions.filter((s) => s.status !== 'on-time').length;
    out.push(late === 0 ? 'All assignments submitted on time' : `${e.submissions.length - late} of ${e.submissions.length} assignments on time`);
    out.push(e.engagementChange >= 0 ? `Engagement up ${e.engagementChange}% in 14 days` : `Engagement steady (${e.engagementChange}% in 14 days)`);
    const s = strongest(e);
    out.push(`Strongest concept: ${s.concept} (${s.value}%)`);
    if (e.momentum >= 5) out.push('Momentum is building week over week');
    return out;
  }
  if (e.engagementChange <= -10) out.push(`Engagement down ${-e.engagementChange}% in 14 days`);
  const lastTwo = e.submissions.slice(-2);
  if (lastTwo.every((s) => s.status === 'late')) out.push('Last two assignments submitted late');
  else if (lastTwo.some((s) => s.status === 'late')) out.push('Most recent assignment submitted late');
  const missing = e.submissions.filter((s) => s.status === 'missing');
  if (missing.length) {
    const title = course.assignments.find((a) => a.id === missing[0].assignmentId)!.title;
    out.push(missing.length === 1 ? `Missing: ${title}` : `${missing.length} missing assignments`);
  }
  const w = weakest(e);
  if (w.prev - w.value >= 4) out.push(`${w.concept} mastery declined ${w.prev}% → ${w.value}%`);
  else out.push(`${w.concept} mastery below class average (${w.value}%)`);
  if (e.visits[7] < e.baselineVisits * 0.75) out.push('Session frequency below personal baseline');
  if (e.risk === 'high') out.push('Similar historical patterns typically precede grade decline');
  else out.push(`Predicted grade ${e.current - e.predicted} points below current`);
  return out;
}

export function primarySignal(e: Enrollment): string {
  if (e.risk === 'low') return e.momentum >= 5 ? 'Getting stronger' : 'Consistent engagement';
  if (e.risk === 'high' && e.submissions.slice(-3).filter((s) => s.status !== 'on-time').length >= 2) return 'Missing/late activity';
  if (e.engagementChange <= -25) return 'Declining engagement';
  return `${weakest(e).concept} mastery`;
}

export interface Recommendation {
  title: string;
  detail: string;
  urgency: string;
  action: 'review' | 'meeting' | 'encourage' | 'none';
  concept: string;
}

export function recommendation(e: Enrollment): Recommendation {
  const first = getStudent(e.studentId)!.first;
  const concept = weakest(e).concept;
  const stalled = enrollmentInterventions(e.id).find((i) => i.status === 'no-change');
  if (e.risk === 'high' && stalled) {
    return {
      title: `Invite ${first} to office hours this week.`,
      detail: `A check-in message on Sep 30 didn't change engagement. Students with a similar pattern respond better to a direct, specific invitation.`,
      urgency: 'Reach out within 48 hours', action: 'meeting', concept,
    };
  }
  if (e.risk === 'high') {
    return {
      title: `Send ${first} a short ${concept} review and check-in.`,
      detail: `Students with a similar pattern who completed a targeted review recovered an average of 11 mastery points within a week.`,
      urgency: 'Reach out within 48 hours', action: 'review', concept,
    };
  }
  if (e.risk === 'moderate') {
    return {
      title: `Share a ${concept} practice resource with ${first}.`,
      detail: `${first}'s grade is holding, but ${concept} is pulling the prediction down. A low-stakes review now is the easiest correction.`,
      urgency: 'Check in this week', action: 'review', concept,
    };
  }
  if (studentStatus(e) === 'Getting Stronger') {
    return {
      title: `Recognize ${first}'s progress.`,
      detail: 'A quick note of encouragement helps sustain momentum.',
      urgency: 'Optional', action: 'encourage', concept,
    };
  }
  return {
    title: 'No action needed right now.',
    detail: `${first} is on track. Theo will let you know if anything changes.`,
    urgency: 'None', action: 'none', concept,
  };
}

/* ---------- course-level intelligence ---------- */

export interface CourseStats {
  size: number;
  current: number;
  predicted: number;
  mastery: number;
  engagement: number;
  completion: number;
  momentum: number;
  engagementChange: number;
  onTrack: number;
  watch: number;
  high: number;
  trendingDown: number;
  gradeTrend: number[];
  projection: number[];
  engagementTrend: number[];
  concepts: { concept: string; value: number; prev: number; struggling: number }[];
  submissions: { assignment: Assignment; onTime: number; late: number; missing: number }[];
  upcoming: { assignment: Assignment; notStarted: number; atRisk: number }[];
  attention: Enrollment[];
  insight: string;
}

const statsCache = new Map<string, CourseStats>();

const attentionOrder = (a: Enrollment, b: Enrollment) => {
  const rank = { high: 0, moderate: 1, low: 2 };
  return rank[a.risk] - rank[b.risk] || (b.current - b.predicted) - (a.current - a.predicted);
};

export function courseStats(courseId: string): CourseStats {
  const cached = statsCache.get(courseId);
  if (cached) return cached;
  const course = getCourse(courseId)!;
  const es = courseEnrollments(courseId);
  const week = (key: 'grades' | 'engagement', i: number) => avg(es.map((e) => e[key][i]));
  const gradeTrend = Array.from({ length: 8 }, (_, i) => Math.round(week('grades', i) * 10) / 10);
  const engagementTrend = Array.from({ length: 8 }, (_, i) => Math.round(week('engagement', i) * 10) / 10);
  const current = Math.round(avg(es.map((e) => e.current)));
  const predicted = Math.round(avg(es.map((e) => e.predicted)));
  const engagementChange = Math.round(((engagementTrend[7] - engagementTrend[5]) / engagementTrend[5]) * 100);
  const momentum = Math.round((((gradeTrend[7] - gradeTrend[5]) / gradeTrend[5] + (engagementTrend[7] - engagementTrend[5]) / engagementTrend[5]) / 2) * 100);
  const watch = es.filter((e) => e.risk === 'moderate');
  const high = es.filter((e) => e.risk === 'high');

  const concepts = course.concepts.map((concept) => {
    const items = es.map((e) => e.mastery.find((m) => m.concept === concept)!);
    return {
      concept,
      value: Math.round(avg(items.map((m) => m.value))),
      prev: Math.round(avg(items.map((m) => m.prev))),
      struggling: items.filter((m) => m.value < 70).length,
    };
  });

  const submissions = pastAssignments(course).map((assignment) => {
    const subs = es.map((e) => e.submissions.find((s) => s.assignmentId === assignment.id)!);
    return {
      assignment,
      onTime: subs.filter((s) => s.status === 'on-time').length,
      late: subs.filter((s) => s.status === 'late').length,
      missing: subs.filter((s) => s.status === 'missing').length,
    };
  });

  const upcoming = upcomingAssignments(course).map((assignment, i) => ({
    assignment,
    notStarted: Math.round(es.length * ([0.42, 0.68, 0.86][i] ?? 0.9)),
    atRisk: es.filter((e) => e.risk !== 'low' && weakest(e).concept === assignment.concept).length,
  }));

  const shared = watch.filter((e) => weakest(e).concept === course.focus).length;
  const health = predicted >= 80 ? 'remains academically healthy' : predicted >= 75 ? 'is holding steady' : 'is showing academic strain';
  let insight = `${course.code} ${health}`;
  if (engagementChange <= -5) insight += `, but engagement has declined ${-engagementChange}% over the last two weeks.`;
  else if (engagementChange >= 3) insight += `, and engagement has grown ${engagementChange}% over the last two weeks.`;
  else insight += ' and engagement is stable.';
  if (watch.length) insight += ` ${word(watch.length)} ${watch.length === 1 ? 'student shows' : 'students show'} early signs of academic risk.`;
  if (shared >= 2) insight += ` ${word(shared)} of those students share difficulty with ${course.focus}.`;
  else if (high.length) insight += ` ${word(high.length)} ${high.length === 1 ? 'student needs' : 'students need'} outreach this week.`;

  const stats: CourseStats = {
    size: es.length,
    current,
    predicted,
    mastery: Math.round(avg(es.flatMap((e) => e.mastery.map((m) => m.value)))),
    engagement: Math.round(engagementTrend[7]),
    completion: Math.round(avg(es.map((e) => e.completion))),
    momentum,
    engagementChange,
    onTrack: es.length - watch.length - high.length,
    watch: watch.length,
    high: high.length,
    trendingDown: es.filter((e) => e.predicted < e.current - 2).length,
    gradeTrend,
    projection: projection(gradeTrend[7], predicted),
    engagementTrend,
    concepts,
    submissions,
    upcoming,
    attention: [...watch, ...high].sort(attentionOrder),
    insight,
  };
  statsCache.set(courseId, stats);
  return stats;
}

/* ---------- professor-level ---------- */

export function professorAttention(professorId: string, limit = 5): Enrollment[] {
  return professorEnrollments(professorId).filter((e) => e.risk !== 'low').sort(attentionOrder).slice(0, limit);
}

export function professorInterventions(professorId: string): Intervention[] {
  const ids = new Set(professorEnrollments(professorId).map((e) => e.id));
  return interventions.filter((i) => ids.has(i.enrollmentId));
}

export function impactSummary(list: Intervention[]) {
  const resolved = list.filter((i) => i.status !== 'measuring');
  const improved = list.filter((i) => i.status === 'improved');
  const gains = improved.filter((i) => i.masteryTo !== undefined).map((i) => i.masteryTo! - i.masteryFrom!);
  return {
    total: list.length,
    improved: improved.length,
    measuring: list.filter((i) => i.status === 'measuring').length,
    rate: resolved.length ? Math.round((improved.length / resolved.length) * 100) : 0,
    avgGain: Math.round(avg(gains)),
    lowered: improved.filter((i) => i.riskFrom !== i.riskTo).length,
  };
}

/* ---------- student-level ---------- */

export function studentSummary(studentId: string) {
  const es = studentEnrollments(studentId);
  const needs = es.filter((e) => e.risk !== 'low');
  const trend = Array.from({ length: 8 }, (_, i) => Math.round(avg(es.map((e) => e.grades[i])) * 10) / 10);
  const current = avg(es.map((e) => e.current));
  const predicted = avg(es.map((e) => e.predicted));
  const focus = needs[0];
  let insight: string;
  if (focus) {
    const course = getCourse(focus.courseId)!;
    const concept = weakest(focus).concept;
    const late = focus.submissions.filter((s) => s.status === 'late').length;
    insight = `You're doing well overall, but ${course.code} is beginning to trend downward. Most of the change comes from ${concept}${late ? ` and ${word(late).toLowerCase()} late submission${late === 1 ? '' : 's'}` : ''}. Spending 15 minutes reviewing ${concept} today would have the largest impact.`;
  } else {
    const best = [...es].sort((a, b) => b.momentum - a.momentum)[0];
    insight = `You're on track in every course, and your strongest momentum is in ${getCourse(best.courseId)!.code}. Keep the rhythm you've built.`;
  }
  return {
    enrollments: es,
    progress: Math.round(avg(es.flatMap((e) => e.mastery.map((m) => m.value)))),
    momentum: Math.round(avg(es.map((e) => e.momentum))),
    onTrack: es.length - needs.length,
    needsAttention: needs.length,
    trend,
    projection: projection(trend[7], Math.round(predicted * 10) / 10),
    current: Math.round(current),
    focus,
    insight,
  };
}

export interface NextAction {
  id: string;
  title: string;
  detail: string;
  courseId: string;
  kind: 'review' | 'assignment';
  enrollmentId: string;
  highlight?: boolean;
}

export function nextActions(studentId: string): NextAction[] {
  const es = studentEnrollments(studentId);
  const reviews: NextAction[] = es.filter((e) => e.risk !== 'low').map((e) => ({
    id: `review:${e.id}`,
    title: `Review ${weakest(e).concept}`,
    detail: `${getCourse(e.courseId)!.code} · 15 min · Biggest impact this week`,
    courseId: e.courseId, kind: 'review', enrollmentId: e.id, highlight: true,
  }));
  const due = es.flatMap((e) => upcomingAssignments(getCourse(e.courseId)!).map((a) => ({ a, e })))
    .filter(({ a }) => a.due <= '2026-10-19')
    .sort((x, y) => x.a.due.localeCompare(y.a.due))
    .map(({ a, e }): NextAction => ({
      id: `assignment:${a.id}`,
      title: `${a.type === 'Quiz' || a.type === 'Exam' ? 'Prepare for' : 'Finish'} ${a.title}`,
      detail: `${getCourse(a.courseId)!.code} · Due ${dueLabel(a.due)}`,
      courseId: a.courseId, kind: 'assignment', enrollmentId: e.id,
    }));
  return [...reviews, ...due].slice(0, 5);
}

export function studentUpcoming(studentId: string) {
  return studentEnrollments(studentId)
    .flatMap((e) => upcomingAssignments(getCourse(e.courseId)!))
    .sort((a, b) => a.due.localeCompare(b.due));
}
