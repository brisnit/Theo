import { Check, EyeOff, GripVertical, LayoutGrid, Plus, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Role } from '../data/types';
import { useApp } from '../state/AppState';
import { Segmented } from './ui';

export interface DashItem {
  id: string;
  title: string;
  span: 4 | 5 | 6 | 7 | 8 | 12;
  node: ReactNode;
}

interface Layout {
  order: string[];
  hidden: string[];
}

function useLayout(storageKey: string, ids: string[]) {
  const [layout, setLayout] = useState<Layout>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw) as Layout;
    } catch {
      /* fall through to default */
    }
    return { order: ids, hidden: [] };
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(layout));
    } catch {
      /* storage unavailable */
    }
  }, [storageKey, layout]);

  // Tolerate cards being added or removed between versions.
  const order = [...layout.order.filter((id) => ids.includes(id)), ...ids.filter((id) => !layout.order.includes(id))];
  const hidden = layout.hidden.filter((id) => ids.includes(id));

  return {
    order,
    hidden,
    move: (dragId: string, overId: string) => setLayout((l) => {
      const next = order.filter((id) => id !== dragId);
      next.splice(next.indexOf(overId) + (order.indexOf(dragId) < order.indexOf(overId) ? 1 : 0), 0, dragId);
      return { ...l, order: next };
    }),
    hide: (id: string) => setLayout((l) => ({ ...l, hidden: [...hidden, id] })),
    restore: (id: string) => setLayout((l) => ({ ...l, hidden: hidden.filter((h) => h !== id) })),
    reset: () => setLayout({ order: ids, hidden: [] }),
  };
}

export function CustomDashboard({ role, storageKey, items, header }: {
  role: Role;
  storageKey: string;
  items: DashItem[];
  header: (controls: ReactNode) => ReactNode;
}) {
  const { density, setDensity } = useApp();
  const [editing, setEditing] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const lastMove = useRef(0);
  const { order, hidden, move, hide, restore, reset } = useLayout(storageKey, items.map((i) => i.id));
  const byId = new Map(items.map((i) => [i.id, i]));
  const visible = order.filter((id) => !hidden.includes(id)).map((id) => byId.get(id)!);

  const controls = (
    <button className={`btn ${editing ? 'btn-dark' : 'btn-ghost'}`} onClick={() => setEditing((e) => !e)}>
      {editing ? <><Check size={16} /> Done</> : <><LayoutGrid size={16} /> Edit dashboard</>}
    </button>
  );

  return (
    <>
      {header(controls)}
      {editing && (
        <div className="edit-bar">
          <div className="edit-bar-hint">
            <GripVertical size={16} />
            Drag cards to reorder. Hide what you don't need.
          </div>
          <div className="edit-bar-group">
            <span className="edit-bar-label">Layout</span>
            <Segmented
              size="sm"
              value={density[role]}
              onChange={(d) => setDensity(role, d)}
              options={[{ value: 'comfortable', label: 'Comfortable' }, { value: 'compact', label: 'Compact' }]}
            />
          </div>
          <div className="edit-bar-group hidden-cards">
            <span className="edit-bar-label">Hidden</span>
            {hidden.length === 0 && <span className="muted small">None</span>}
            {hidden.map((id) => (
              <button key={id} className="chip chip-add" onClick={() => restore(id)}>
                <Plus size={13} /> {byId.get(id)?.title}
              </button>
            ))}
          </div>
          <button className="btn btn-quiet btn-sm" onClick={reset}><RotateCcw size={14} /> Reset</button>
        </div>
      )}
      <div className={`dash-grid ${editing ? 'is-editing' : ''}`}>
        {visible.map((item) => (
          <div
            key={item.id}
            className={`dash-item span-${item.span} ${dragId === item.id ? 'is-dragging' : ''}`}
            draggable={editing}
            onDragStart={(e) => {
              setDragId(item.id);
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', item.id);
            }}
            onDragEnter={() => {
              // Throttle so cards of different sizes don't oscillate under the cursor.
              if (!dragId || dragId === item.id || Date.now() - lastMove.current < 280) return;
              lastMove.current = Date.now();
              move(dragId, item.id);
            }}
            onDragOver={(e) => editing && e.preventDefault()}
            onDrop={(e) => e.preventDefault()}
            onDragEnd={() => setDragId(null)}
          >
            {editing && (
              <div className="dash-edit-handle">
                <span><GripVertical size={15} /> {item.title}</span>
                <button className="icon-btn" onClick={() => hide(item.id)} aria-label={`Hide ${item.title}`}>
                  <EyeOff size={15} /> Hide
                </button>
              </div>
            )}
            <div className="dash-content">{item.node}</div>
          </div>
        ))}
      </div>
    </>
  );
}
