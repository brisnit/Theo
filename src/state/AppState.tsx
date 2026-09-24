import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { nowIso } from '../data/calendar';
import { getProfessor, getStudent } from '../data/insights';
import { seedThreads } from '../data/mock';
import type { Intervention, Role, Thread } from '../data/types';

export type Density = 'comfortable' | 'compact';

export interface ActionRecord {
  kind: 'messaged' | 'assigned' | 'dismissed' | 'meeting' | 'encouraged';
  date: string;
  note?: string;
}

interface Toast {
  id: number;
  text: string;
  tone: 'default' | 'success';
}

interface ChatTarget {
  threadId: string;
  role: Role;
  draft?: string;
}

interface AppState {
  threads: Thread[];
  typing: Record<string, boolean>;
  send: (threadId: string, from: Role, text: string) => void;
  markRead: (threadId: string, role: Role) => void;
  ensureThread: (professorId: string, studentId: string, courseId: string) => string;
  chat: ChatTarget | null;
  openChat: (threadId: string, role: Role, draft?: string) => void;
  closeChat: () => void;
  assistant: { open: boolean; ask?: { q: string; n: number } };
  askTheo: (question?: string) => void;
  closeAssistant: () => void;
  actions: Record<string, ActionRecord>;
  recordAction: (enrollmentId: string, record: ActionRecord, intervention?: Intervention) => void;
  addedInterventions: Intervention[];
  toasts: Toast[];
  toast: (text: string, tone?: Toast['tone']) => void;
  doneTasks: Record<string, boolean>;
  toggleTask: (id: string, done?: boolean) => void;
  review: string | null;
  openReview: (enrollmentId: string | null) => void;
  density: Record<Role, Density>;
  setDensity: (role: Role, d: Density) => void;
}

const Ctx = createContext<AppState | null>(null);

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside AppStateProvider');
  return ctx;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

let seq = 1;

function cannedReply(thread: Thread, from: Role, text: string): string {
  const t = text.toLowerCase();
  if (from === 'professor') {
    const prof = getProfessor(thread.professorId);
    if (/review|resource|module|practice/.test(t)) return `Thank you, ${prof.name.split(' ')[0]} ${prof.last}! I'll work through it tonight and let you know if I get stuck.`;
    if (/office|meet|thursday|talk/.test(t)) return 'Yes — I can come by Thursday afternoon. Thank you for making time.';
    return "Thanks for checking in. It's been a busy couple of weeks, but I'm getting caught up now.";
  }
  const student = getStudent(thread.studentId)!;
  if (/thesis|essay|draft/.test(t)) return `Happy to help, ${student.first}. Start with the Theological Argument review in Module 6, then bring your working thesis to office hours Thursday (2–4 PM).`;
  if (/extension|late|behind|sick/.test(t)) return "Thanks for letting me know. Let's talk after class and put together a plan that works.";
  return `Thanks for reaching out, ${student.first}! I'll take a look and get back to you today.`;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [threads, setThreads] = useState<Thread[]>(() => structuredClone(seedThreads));
  const [typing, setTyping] = useState<Record<string, boolean>>({});
  const [chat, setChat] = useState<ChatTarget | null>(null);
  const [assistant, setAssistant] = useState<AppState['assistant']>({ open: false });
  const [actions, setActions] = useState<Record<string, ActionRecord>>({});
  const [addedInterventions, setAdded] = useState<Intervention[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [doneTasks, setDoneTasks] = useState<Record<string, boolean>>({});
  const [review, setReview] = useState<string | null>(null);
  const [density, setDensityState] = useState<Record<Role, Density>>(() =>
    readJson('theo:density', { professor: 'comfortable', student: 'comfortable' }));

  useEffect(() => {
    try {
      localStorage.setItem('theo:density', JSON.stringify(density));
    } catch {
      /* storage unavailable — layout simply won't persist */
    }
  }, [density]);

  const send = useCallback((threadId: string, from: Role, text: string) => {
    const other: Role = from === 'professor' ? 'student' : 'professor';
    let thread: Thread | undefined;
    setThreads((ts) => ts.map((t) => {
      if (t.id !== threadId) return t;
      thread = t;
      return { ...t, messages: [...t.messages, { id: `u${seq++}`, from, text, time: nowIso() }] };
    }));
    // Mock the other person reading and replying.
    window.setTimeout(() => setTyping((x) => ({ ...x, [threadId]: true })), 1000);
    window.setTimeout(() => {
      setTyping((x) => ({ ...x, [threadId]: false }));
      setThreads((ts) => ts.map((t) => (t.id !== threadId ? t : {
        ...t,
        messages: [...t.messages, { id: `u${seq++}`, from: other, text: cannedReply(thread ?? t, from, text), time: nowIso() }],
        unread: { ...t.unread, [from]: t.unread[from] + 1 },
      })));
    }, 3200);
  }, []);

  const markRead = useCallback((threadId: string, role: Role) => {
    setThreads((ts) => (ts.some((t) => t.id === threadId && t.unread[role] > 0)
      ? ts.map((t) => (t.id === threadId ? { ...t, unread: { ...t.unread, [role]: 0 } } : t))
      : ts));
  }, []);

  const ensureThread = useCallback((professorId: string, studentId: string, courseId: string) => {
    const id = `${professorId}:${studentId}`;
    setThreads((ts) => (ts.some((t) => t.id === id) ? ts
      : [...ts, { id, professorId, studentId, courseId, messages: [], unread: { professor: 0, student: 0 } }]));
    return id;
  }, []);

  const toast = useCallback((text: string, tone: Toast['tone'] = 'default') => {
    const id = seq++;
    setToasts((t) => [...t, { id, text, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);

  const value = useMemo<AppState>(() => ({
    threads,
    typing,
    send,
    markRead,
    ensureThread,
    chat,
    openChat: (threadId, role, draft) => {
      setAssistant({ open: false });
      setChat({ threadId, role, draft });
    },
    closeChat: () => setChat(null),
    assistant,
    askTheo: (q) => {
      setChat(null);
      setAssistant({ open: true, ask: q ? { q, n: seq++ } : undefined });
    },
    closeAssistant: () => setAssistant({ open: false }),
    actions,
    recordAction: (enrollmentId, record, intervention) => {
      setActions((a) => ({ ...a, [enrollmentId]: record }));
      if (intervention) setAdded((list) => [intervention, ...list]);
    },
    addedInterventions,
    toasts,
    toast,
    doneTasks,
    toggleTask: (id, done) => setDoneTasks((d) => ({ ...d, [id]: done ?? !d[id] })),
    review,
    openReview: setReview,
    density,
    setDensity: (role, d) => setDensityState((x) => ({ ...x, [role]: d })),
  }), [threads, typing, send, markRead, ensureThread, chat, assistant, actions, addedInterventions, toasts, toast, doneTasks, review, density]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
