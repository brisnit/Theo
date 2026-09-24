export type Role = 'professor' | 'student';
export type Risk = 'low' | 'moderate' | 'high';
export type Archetype = 'steady' | 'rising' | 'watch' | 'high';
export type SubStatus = 'on-time' | 'late' | 'missing';

export interface Professor {
  id: string;
  name: string;
  last: string;
  title: string;
  initials: string;
}

export interface Student {
  id: string;
  name: string;
  first: string;
  initials: string;
  year: string;
  major: string;
}

export interface Assignment {
  id: string;
  courseId: string;
  title: string;
  type: 'Essay' | 'Quiz' | 'Discussion' | 'Project' | 'Exam' | 'Reflection' | 'Worksheet';
  concept: string;
  /** YYYY-MM-DD */
  due: string;
  points: number;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  professorId: string;
  schedule: string;
  concepts: string[];
  /** The concept most students find hardest this term. */
  focus: string;
  color: string;
  assignments: Assignment[];
  roster: string[];
}

export interface MasteryItem {
  concept: string;
  value: number;
  /** Value two weeks ago. */
  prev: number;
}

export interface Submission {
  assignmentId: string;
  status: SubStatus;
  score?: number;
}

/** One student in one course — the unit Theo predicts on. */
export interface Enrollment {
  id: string;
  courseId: string;
  studentId: string;
  archetype: Archetype;
  risk: Risk;
  current: number;
  predicted: number;
  /** +/- confidence range around the prediction. */
  band: number;
  /** Weekly grade, weeks 1–8. */
  grades: number[];
  /** Weekly engagement index (0–100), weeks 1–8. */
  engagement: number[];
  engagementChange: number;
  momentum: number;
  mastery: MasteryItem[];
  weak?: string;
  submissions: Submission[];
  /** Canvas sessions per week, weeks 1–8. */
  visits: number[];
  baselineVisits: number;
  participation: number;
  completion: number;
  lastActive: string;
}

export interface InterventionStep {
  date: string;
  text: string;
  kind: 'action' | 'student' | 'outcome' | 'pending';
}

export interface Intervention {
  id: string;
  enrollmentId: string;
  title: string;
  status: 'improved' | 'measuring' | 'no-change';
  steps: InterventionStep[];
  riskFrom?: Risk;
  riskTo?: Risk;
  masteryFrom?: number;
  masteryTo?: number;
  concept?: string;
}

export interface Message {
  id: string;
  from: Role;
  text: string;
  /** YYYY-MM-DDTHH:MM */
  time: string;
}

export interface Thread {
  id: string;
  professorId: string;
  studentId: string;
  courseId: string;
  messages: Message[];
  unread: Record<Role, number>;
}
