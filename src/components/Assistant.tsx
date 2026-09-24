import { ArrowRight, ArrowUp, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { getProfessor, getStudent } from '../data/insights';
import { DEMO_PROFESSOR, DEMO_STUDENT } from '../data/mock';
import type { Role } from '../data/types';
import { answer, suggestions, type Answer, type AssistantContext } from '../lib/assistant';
import { Link } from '../lib/router';
import { useApp } from '../state/AppState';

interface Turn {
  id: number;
  q: string;
  a?: Answer;
}

let turnId = 1;

export function Assistant({ role, ctx }: { role: Role; ctx: AssistantContext }) {
  const { assistant, askTheo, closeAssistant, chat } = useApp();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  const ask = (q: string) => {
    const id = turnId++;
    setTurns((t) => [...t, { id, q }]);
    window.setTimeout(() => {
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, a: answer(role, q, ctxRef.current) } : x)));
    }, 700);
  };

  useEffect(() => {
    if (assistant.ask) ask(assistant.ask.q);
    // Only fire when a new question is pushed in from elsewhere in the UI.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistant.ask?.n]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns]);

  if (!assistant.open) {
    if (chat) return null;
    return (
      <button className="theo-launcher" onClick={() => askTheo()}>
        <Sparkles size={16} /> Ask Theo
      </button>
    );
  }

  const name = role === 'professor' ? getProfessor(DEMO_PROFESSOR).name : getStudent(DEMO_STUDENT)!.first;

  return (
    <aside className="drawer assistant" aria-label="Ask Theo">
      <header className="drawer-head">
        <span className="assistant-mark"><Sparkles size={18} /></span>
        <div className="drawer-title">
          <strong>Ask Theo</strong>
          <span>Answers from your Canvas learning data</span>
        </div>
        <button className="icon-btn" onClick={closeAssistant} aria-label="Close"><X size={18} /></button>
      </header>
      <div className="assistant-body" ref={bodyRef}>
        {turns.length === 0 && (
          <div className="assistant-intro">
            <p>Hi {name}. {role === 'professor' ? 'Ask me who needs you, why, and what to do about it.' : 'Ask me what to focus on and why.'}</p>
          </div>
        )}
        {turns.map((t) => (
          <div key={t.id} className="turn">
            <div className="turn-q">{t.q}</div>
            {t.a ? (
              <div className="turn-a">
                <p>{t.a.text}</p>
                {t.a.bullets && <ul>{t.a.bullets.map((b) => <li key={b}>{b}</li>)}</ul>}
                {t.a.footer && <p className="turn-footer">{t.a.footer}</p>}
                {t.a.links && (
                  <div className="turn-links">
                    {t.a.links.map((l) => (
                      <Link key={l.to} to={l.to} className="chip chip-link">{l.label} <ArrowRight size={13} /></Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="turn-a thinking"><i /><i /><i /></div>
            )}
          </div>
        ))}
      </div>
      <div className="assistant-suggest">
        {suggestions(role, ctx).map((s) => (
          <button key={s} className="chip" onClick={() => ask(s)}>{s}</button>
        ))}
      </div>
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim()) return;
          ask(input.trim());
          setInput('');
        }}
      >
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about a student, course, or this week…" />
        <button className="send-btn" type="submit" disabled={!input.trim()} aria-label="Ask"><ArrowUp size={18} /></button>
      </form>
    </aside>
  );
}
