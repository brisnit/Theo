import { dueLabel } from '../data/calendar';
import {
  courseStats, getCourse, getStudent, impactSummary, primarySignal, professorAttention, professorCourses,
  professorEnrollments, professorInterventions, recommendation, riskLabel, signals, studentEnrollments,
  studentStatus, studentSummary, studentUpcoming, weakest,
} from '../data/insights';
import { DEMO_PROFESSOR, DEMO_STUDENT } from '../data/mock';
import type { Enrollment, Role } from '../data/types';

export interface Answer {
  text: string;
  bullets?: string[];
  footer?: string;
  links?: { label: string; to: string }[];
}

export interface AssistantContext {
  courseId?: string;
  studentId?: string;
}

/**
 * A rule-based stand-in for Theo's language layer. Every answer is grounded in the same
 * mocked Canvas data the dashboards render, so the assistant never contradicts the UI.
 */
export function suggestions(role: Role, ctx: AssistantContext): string[] {
  if (role === 'student') return ['What should I work on?', 'Why is English trending down?', 'What can I do tonight?'];
  if (ctx.studentId) {
    const first = getStudent(ctx.studentId)!.first;
    return [`Why is ${first} flagged?`, `What should I do for ${first}?`, 'Who needs my attention today?'];
  }
  if (ctx.courseId) return [`How is ${getCourse(ctx.courseId)!.code} doing?`, 'What changed this week?', 'Who needs my attention today?'];
  return ['Who needs my attention today?', 'Why is Maya at risk?', 'What changed this week?'];
}

const profileLink = (e: Enrollment) => ({
  label: `Open ${getStudent(e.studentId)!.first}'s profile`,
  to: `/professor/course/${e.courseId}/student/${e.studentId}`,
});

function findStudentEnrollment(q: string, ctx: AssistantContext): Enrollment | undefined {
  const pool = professorEnrollments(DEMO_PROFESSOR);
  const rank = { high: 0, moderate: 1, low: 2 };
  const matches = pool.filter((e) => {
    const s = getStudent(e.studentId)!;
    return new RegExp(`\\b${s.first.toLowerCase()}\\b`).test(q);
  }).sort((a, b) => rank[a.risk] - rank[b.risk]);
  if (matches.length) return matches.find((e) => e.courseId === ctx.courseId) ?? matches[0];
  if (ctx.studentId && /\b(she|he|they|them|her|him|this student|student)\b|why|flag|do for/.test(q)) {
    return pool.find((e) => e.studentId === ctx.studentId && (!ctx.courseId || e.courseId === ctx.courseId));
  }
  return undefined;
}

function findCourse(q: string, courseIds: string[]) {
  return courseIds.map((id) => getCourse(id)!).find((c) => {
    const [, dept, num] = c.code.toLowerCase().match(/^([a-z]+)\s*(\d+)/)!;
    return q.includes(num) || q.includes(c.title.toLowerCase()) || new RegExp(`\\b${dept}\\b`).test(q)
      || (dept === 'st' && /systematic|theology|doctrin|writing/.test(q))
      || (dept === 'pf' && /psych|development|being human/.test(q)) || (dept === 'nt' && /new testament|greek|exegesis/.test(q))
      || (dept === 'ot' && /old testament|hebrew/.test(q)) || (dept === 'sf' && /mission|missiolog|intercultural/.test(q))
      || (dept === 'ld' && /leadership|ministry/.test(q));
  });
}

export function answer(role: Role, raw: string, ctx: AssistantContext): Answer {
  const q = raw.toLowerCase();
  return role === 'professor' ? professorAnswer(q, ctx) : studentAnswer(q);
}

function professorAnswer(q: string, ctx: AssistantContext): Answer {
  const courseIds = professorCourses(DEMO_PROFESSOR).map((c) => c.id);
  const enrollment = findStudentEnrollment(q, ctx);

  if (enrollment && /what should|what do|recommend|intervene|help|do for/.test(q)) {
    const s = getStudent(enrollment.studentId)!;
    const rec = recommendation(enrollment);
    return {
      text: `For ${s.first} in ${getCourse(enrollment.courseId)!.code}, Theo recommends:`,
      bullets: [rec.title, rec.detail, `Timing: ${rec.urgency}`],
      links: [profileLink(enrollment)],
    };
  }

  if (enrollment) {
    const s = getStudent(enrollment.studentId)!;
    const course = getCourse(enrollment.courseId)!;
    if (enrollment.risk === 'low') {
      return {
        text: `${s.first} is on track in ${course.code} — ${enrollment.current}% now, predicted ${enrollment.predicted}%.`,
        bullets: signals(enrollment).slice(0, 3),
        links: [profileLink(enrollment)],
      };
    }
    return {
      text: `${s.first} is ${riskLabel(enrollment.risk).toLowerCase()} in ${course.code}. Their grade is ${enrollment.current}% today, but Theo predicts ${enrollment.predicted}% by the end of term if nothing changes. The main signals:`,
      bullets: signals(enrollment).slice(0, 4),
      footer: `Recommended: ${recommendation(enrollment).title}`,
      links: [profileLink(enrollment)],
    };
  }

  if (/chang|this week|new|different|lately/.test(q)) {
    const impact = impactSummary(professorInterventions(DEMO_PROFESSOR));
    return {
      text: 'Here’s what moved over the last 14 days across your courses:',
      bullets: [
        ...courseIds.map((id) => {
          const c = getCourse(id)!;
          const st = courseStats(id);
          const dir = st.engagementChange < 0 ? `down ${-st.engagementChange}%` : `up ${st.engagementChange}%`;
          return `${c.code}: engagement ${dir}, ${st.high} high risk, ${st.watch} on watch`;
        }),
        `${impact.measuring} interventions are being measured; ${impact.improved} earlier ones improved outcomes`,
      ],
      footer: 'The largest shift is ST505 engagement — mostly concentrated in students struggling with Theological Argument.',
    };
  }

  const course = findCourse(q, courseIds) ?? (ctx.courseId && /how|doing|class|course|summary|going/.test(q) ? getCourse(ctx.courseId) : undefined);
  if (course && /how|doing|class|course|summary|going|status|insight/.test(q)) {
    const st = courseStats(course.id);
    return {
      text: st.insight,
      bullets: [
        `Class average ${st.current}% → predicted ${st.predicted}%`,
        `${st.onTrack} on track · ${st.watch} watch · ${st.high} high risk`,
        `Lowest concept: ${[...st.concepts].sort((a, b) => a.value - b.value)[0].concept}`,
      ],
      links: [{ label: `Open ${course.code}`, to: `/professor/course/${course.id}` }],
    };
  }

  if (/attention|today|need|priorit|who should|first|urgent/.test(q)) {
    const top = professorAttention(DEMO_PROFESSOR, 3);
    return {
      text: `${top.length} students should hear from you first:`,
      bullets: top.map((e) => {
        const s = getStudent(e.studentId)!;
        return `${s.name} (${getCourse(e.courseId)!.code}) — ${primarySignal(e)}. ${recommendation(e).urgency}.`;
      }),
      links: top.slice(0, 2).map(profileLink),
    };
  }

  if (/intervention|work|impact|prove|help/.test(q)) {
    const impact = impactSummary(professorInterventions(DEMO_PROFESSOR));
    return {
      text: `${impact.rate}% of your measured interventions this term improved the student's trajectory.`,
      bullets: [
        `${impact.improved} improved · ${impact.measuring} still measuring`,
        `Average mastery gain after a targeted review: +${impact.avgGain} points`,
        `${impact.lowered} students moved to a lower risk level`,
      ],
      links: [{ label: 'Open Impact', to: '/professor/impact' }],
    };
  }

  return {
    text: 'I can explain what Theo sees in your Canvas data. Try asking:',
    bullets: ['“Who needs my attention today?”', '“Why is Maya at risk?”', '“How is PF501 doing?”', '“Are my interventions working?”'],
  };
}

function studentAnswer(q: string): Answer {
  const summary = studentSummary(DEMO_STUDENT);
  const focus = summary.focus;
  const focusCourse = focus ? getCourse(focus.courseId)! : undefined;
  const concept = focus ? weakest(focus).concept : undefined;
  const upcoming = studentUpcoming(DEMO_STUDENT);

  if (/tonight|today|now|evening|hour|time/.test(q)) {
    const soon = upcoming[0];
    return {
      text: 'Here’s a focused 45-minute plan for tonight:',
      bullets: [
        focus ? `15 min — ${concept} review (${focusCourse!.code})` : '15 min — Review this week’s notes',
        focus ? '20 min — Draft your thesis and three supporting theological grounds for the Doctrinal Essay' : '20 min — Get ahead on your next assignment',
        `10 min — Prepare for ${soon.title} (${getCourse(soon.courseId)!.code}, due ${dueLabel(soon.due).toLowerCase()})`,
      ],
      footer: 'That’s the smallest amount of time with the biggest effect on where your grades are headed.',
    };
  }

  if (/why|theology|systematic|trinity|st505|trending|down|drop|writing/.test(q) && focus) {
    const late = focus.submissions.filter((s) => s.status === 'late').length;
    const w = weakest(focus);
    return {
      text: `${focusCourse!.code} is trending down mainly for three reasons:`,
      bullets: [
        `${late} recent assignments were turned in late, and one discussion is still open`,
        `${w.concept} practice went from ${w.prev}% to ${w.value}%`,
        'You’ve visited the course less than usual over the last two weeks',
      ],
      footer: `The good news: your grade is still ${focus.current}%, and your work with Theological Sources is strong (${focus.mastery.find((m) => m.concept === 'Theological Sources')?.value ?? 89}%). Catching up this week puts you right back on track.`,
    };
  }

  if (/work on|focus|should i|priority|next|improve/.test(q)) {
    return {
      text: focus ? `Start with ${concept} in ${focusCourse!.code}. It has the largest effect on your semester right now.` : 'You’re on track everywhere. Keep your rhythm with these:',
      bullets: [
        ...(focus ? [`A 15-minute ${concept} review from Canvas Module 6`] : []),
        ...upcoming.slice(0, 3).map((a) => `${a.title} — ${getCourse(a.courseId)!.code}, due ${dueLabel(a.due)}`),
      ],
    };
  }

  const course = findCourse(q, studentEnrollments(DEMO_STUDENT).map((e) => e.courseId));
  if (course) {
    const e = studentEnrollments(DEMO_STUDENT).find((x) => x.courseId === course.id)!;
    return {
      text: `${course.code}: ${studentStatus(e)}. You're at ${e.current}% and headed toward about ${e.predicted}%.`,
      bullets: [`Strongest area: ${[...e.mastery].sort((a, b) => b.value - a.value)[0].concept}`, `Area to grow: ${weakest(e).concept}`],
      links: [{ label: `Open ${course.code}`, to: `/student/course/${course.id}` }],
    };
  }

  if (/how am i|doing|overall|progress|semester/.test(q)) {
    return {
      text: `You're making real progress — overall progress is ${summary.progress}% and your momentum is up ${summary.momentum}%.`,
      bullets: summary.enrollments.map((e) => `${getCourse(e.courseId)!.code}: ${studentStatus(e)}`),
    };
  }

  return {
    text: 'I can help you figure out where to spend your time. Try asking:',
    bullets: ['“What should I work on?”', '“Why is English trending down?”', '“What can I do tonight?”'],
  };
}
