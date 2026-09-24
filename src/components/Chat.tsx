import { ArrowUp, Maximize2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { fmtTime } from '../data/calendar';
import { getCourse, getEnrollment, getProfessor, getStudent, riskLabel } from '../data/insights';
import type { Role, Thread } from '../data/types';
import { Link } from '../lib/router';
import { useApp } from '../state/AppState';
import { Avatar } from './ui';

export function counterpart(thread: Thread, role: Role) {
  if (role === 'professor') {
    const s = getStudent(thread.studentId)!;
    const e = getEnrollment(thread.courseId, thread.studentId);
    const course = getCourse(thread.courseId)!;
    return { name: s.name, initials: s.initials, sub: `${course.code}${e ? ` · ${riskLabel(e.risk)}` : ''}` };
  }
  const p = getProfessor(thread.professorId);
  return { name: p.name, initials: p.initials, sub: getCourse(thread.courseId)!.code };
}

export function Conversation({ threadId, role, draft }: { threadId: string; role: Role; draft?: string }) {
  const { threads, typing, send, markRead } = useApp();
  const thread = threads.find((t) => t.id === threadId);
  const [text, setText] = useState(draft ?? '');
  const endRef = useRef<HTMLDivElement>(null);
  const count = thread?.messages.length ?? 0;

  // Effects use block bodies on purpose: an implicit return becomes the cleanup function,
  // and Chrome's scrollIntoView now returns a Promise, which React then tries to call on unmount.
  useEffect(() => {
    setText(draft ?? '');
  }, [threadId, draft]);
  useEffect(() => {
    markRead(threadId, role);
  }, [threadId, role, count, markRead]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [count, typing[threadId], threadId]);

  if (!thread) return null;
  const other = counterpart(thread, role);

  const submit = () => {
    const value = text.trim();
    if (!value) return;
    send(threadId, role, value);
    setText('');
  };

  return (
    <div className="conversation">
      <div className="messages">
        {thread.messages.length === 0 && (
          <div className="messages-empty">Start a conversation with {other.name.split(' ')[0]}. Messages also appear in their Theo dashboard.</div>
        )}
        {thread.messages.map((m, i) => {
          const mine = m.from === role;
          const prev = thread.messages[i - 1];
          const showTime = !prev || prev.from !== m.from || prev.time.slice(0, 13) !== m.time.slice(0, 13);
          return (
            <div key={m.id} className={`msg ${mine ? 'mine' : 'theirs'}`}>
              {showTime && <div className="msg-time">{mine ? 'You' : other.name} · {fmtTime(m.time)}</div>}
              <div className="bubble">{m.text}</div>
            </div>
          );
        })}
        {typing[threadId] && (
          <div className="msg theirs">
            <div className="bubble typing"><i /><i /><i /></div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form className="composer" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <textarea
          value={text}
          rows={Math.min(5, Math.max(1, text.split('\n').length + Math.floor(text.length / 60)))}
          placeholder={`Message ${other.name}`}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button className="send-btn" type="submit" disabled={!text.trim()} aria-label="Send"><ArrowUp size={18} /></button>
      </form>
    </div>
  );
}

export function ChatPanel() {
  const { chat, threads, closeChat } = useApp();
  if (!chat) return null;
  const thread = threads.find((t) => t.id === chat.threadId);
  if (!thread) return null;
  const other = counterpart(thread, chat.role);
  return (
    <aside className="drawer chat-drawer" aria-label="Messages">
      <header className="drawer-head">
        <Avatar initials={other.initials} size={40} dark={chat.role === 'student'} />
        <div className="drawer-title">
          <strong>{other.name}</strong>
          <span>{other.sub}</span>
        </div>
        <Link to={`/${chat.role}/messages/${thread.id}`} className="icon-btn" onClick={closeChat} aria-label="Open in Messages"><Maximize2 size={16} /></Link>
        <button className="icon-btn" onClick={closeChat} aria-label="Close"><X size={18} /></button>
      </header>
      <Conversation threadId={chat.threadId} role={chat.role} draft={chat.draft} />
    </aside>
  );
}
