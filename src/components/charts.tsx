import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { C } from '../data/palette';

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

type Pt = [number, number];

/** Gentle Catmull-Rom smoothing; data here is monotone enough that overshoot is negligible. */
function smoothPath(pts: Pt[]): string {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/* ---------- Sparkline ---------- */

export function Sparkline({ data, projected, height = 40, color = C.blue }: {
  data: number[];
  projected?: number[];
  height?: number;
  color?: string;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const id = useId();
  const all = [...data, ...(projected ?? [])];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = Math.max(max - min, 4);
  const n = data.length + (projected ? projected.length - 1 : 0);
  const x = (i: number) => 2 + (i / (n - 1)) * (w - 4);
  const y = (v: number) => 4 + (1 - (v - min + (span - (max - min)) / 2) / span) * (height - 8);
  const pts: Pt[] = data.map((v, i) => [x(i), y(v)]);
  const proj: Pt[] = (projected ?? []).map((v, i) => [x(data.length - 1 + i), y(v)]);
  const last = pts[pts.length - 1];
  return (
    <div ref={ref} style={{ height }} className="spark">
      {w > 0 && (
        <svg width={w} height={height} aria-hidden>
          <defs>
            <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity="0.16" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${smoothPath(pts)} L${last[0]},${height} L${pts[0][0]},${height} Z`} fill={`url(#${id})`} />
          <path d={smoothPath(pts)} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
          {proj.length > 1 && (
            <path d={smoothPath(proj)} fill="none" stroke={color} strokeOpacity={0.55} strokeWidth={2} strokeDasharray="3 4" strokeLinecap="round" />
          )}
          <circle cx={last[0]} cy={last[1]} r={3} fill="#fff" stroke={color} strokeWidth={2} />
        </svg>
      )}
    </div>
  );
}

/* ---------- TrendChart: actual line, dashed prediction, confidence band, hover ---------- */

export interface Series {
  label: string;
  data: (number | null)[];
  color: string;
  dashed?: boolean;
  area?: boolean;
}

export function TrendChart({
  labels, series, band, height = 220, domain, ticks, format = (v) => `${Math.round(v)}%`, marker, legend = true,
}: {
  labels: string[];
  series: Series[];
  band?: { lo: (number | null)[]; hi: (number | null)[]; color?: string };
  height?: number;
  domain?: [number, number];
  ticks?: number[];
  format?: (v: number) => string;
  marker?: { index: number; label: string };
  legend?: boolean;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const values = series.flatMap((s) => s.data).concat(band ? [...band.lo, ...band.hi] : []).filter((v): v is number => v !== null);
  const lo = domain?.[0] ?? Math.floor((Math.min(...values) - 4) / 5) * 5;
  const hi = domain?.[1] ?? Math.ceil((Math.max(...values) + 4) / 5) * 5;
  const yTicks = ticks ?? [lo, (lo + hi) / 2, hi];
  const m = { top: 14, right: 12, bottom: 26, left: 38 };
  const iw = Math.max(0, w - m.left - m.right);
  const ih = height - m.top - m.bottom;
  const x = (i: number) => m.left + (labels.length === 1 ? iw / 2 : (i / (labels.length - 1)) * iw);
  const y = (v: number) => m.top + (1 - (v - lo) / (hi - lo)) * ih;

  const segments = (data: (number | null)[]) => {
    const out: Pt[][] = [];
    let cur: Pt[] = [];
    data.forEach((v, i) => {
      if (v === null) {
        if (cur.length) out.push(cur);
        cur = [];
      } else cur.push([x(i), y(v)]);
    });
    if (cur.length) out.push(cur);
    return out;
  };

  let bandPath = '';
  if (band) {
    const idx = band.lo.map((v, i) => (v !== null && band.hi[i] !== null ? i : -1)).filter((i) => i >= 0);
    if (idx.length > 1) {
      const top = smoothPath(idx.map((i) => [x(i), y(band.hi[i]!)]));
      const bottom = idx.map((i) => [x(i), y(band.lo[i]!)] as Pt).reverse();
      bandPath = `${top} L${bottom.map((p) => p.join(',')).join(' L')} Z`;
    }
  }

  const labelEvery = Math.ceil(labels.length / Math.max(2, Math.floor(iw / 44)));

  return (
    <div className="trend">
      {legend && series.length > 1 && (
        <div className="legend">
          {series.map((s) => (
            <span key={s.label}>
              <i style={{ background: s.dashed ? 'transparent' : s.color, borderColor: s.color }} className={s.dashed ? 'dash' : ''} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <div ref={ref} style={{ height, position: 'relative' }}>
        {w > 0 && (
          <svg
            width={w}
            height={height}
            onMouseLeave={() => setHover(null)}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const i = Math.round(((e.clientX - rect.left - m.left) / iw) * (labels.length - 1));
              setHover(Math.max(0, Math.min(labels.length - 1, i)));
            }}
          >
            <defs>
              <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor={series[0]?.color ?? C.blue} stopOpacity="0.14" />
                <stop offset="1" stopColor={series[0]?.color ?? C.blue} stopOpacity="0" />
              </linearGradient>
            </defs>
            {yTicks.map((t) => (
              <g key={t}>
                <line x1={m.left} x2={w - m.right} y1={y(t)} y2={y(t)} stroke={C.grid} />
                <text x={m.left - 8} y={y(t) + 4} textAnchor="end" className="axis">{format(t)}</text>
              </g>
            ))}
            {labels.map((l, i) => (i % labelEvery === 0 || i === labels.length - 1) && (
              <text key={l + i} x={x(i)} y={height - 6} textAnchor="middle" className="axis">{l}</text>
            ))}
            {marker && (
              <g>
                <line x1={x(marker.index)} x2={x(marker.index)} y1={m.top - 4} y2={m.top + ih} stroke={C.slate} strokeDasharray="2 3" />
                <text x={x(marker.index) + 6} y={m.top + 6} className="axis marker">{marker.label}</text>
              </g>
            )}
            {bandPath && <path d={bandPath} fill={band?.color ?? C.peri} fillOpacity={0.18} />}
            {series.map((s) => segments(s.data).map((pts, k) => (
              <g key={s.label + k}>
                {s.area && pts.length > 1 && (
                  <path d={`${smoothPath(pts)} L${pts[pts.length - 1][0]},${m.top + ih} L${pts[0][0]},${m.top + ih} Z`} fill={`url(#${id})`} />
                )}
                <path
                  d={smoothPath(pts)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2.25}
                  strokeLinecap="round"
                  strokeDasharray={s.dashed ? '5 5' : undefined}
                />
              </g>
            )))}
            {hover !== null && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={m.top} y2={m.top + ih} stroke={C.navy} strokeOpacity={0.12} />
                {series.map((s) => s.data[hover] !== null && s.data[hover] !== undefined && (
                  <circle key={s.label} cx={x(hover)} cy={y(s.data[hover]!)} r={4} fill="#fff" stroke={s.color} strokeWidth={2} />
                ))}
              </g>
            )}
          </svg>
        )}
        {hover !== null && w > 0 && (
          <div className="tooltip" style={{ left: Math.min(Math.max(x(hover), 70), w - 70), top: 0 }}>
            <strong>{labels[hover]}</strong>
            {series.map((s) => s.data[hover] !== null && s.data[hover] !== undefined && (
              <span key={s.label}><i style={{ background: s.color }} />{s.label} <b>{format(s.data[hover]!)}</b></span>
            ))}
            {band && band.lo[hover] !== null && band.hi[hover] !== null && (
              <span className="muted">Range {format(band.lo[hover]!)}–{format(band.hi[hover]!)}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Donut ---------- */

export function Donut({ segments, size = 148, thickness = 16, center }: {
  segments: { value: number; color: string; label: string }[];
  size?: number;
  thickness?: number;
  center?: ReactNode;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  const gap = segments.filter((s) => s.value > 0).length > 1 ? 3 : 0;
  let offset = 0;
  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.track} strokeWidth={thickness} />
        {segments.map((s) => {
          const len = (s.value / total) * circ;
          const el = s.value > 0 && (
            <circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={`${Math.max(0, len - gap)} ${circ}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      {center && <div className="donut-center">{center}</div>}
    </div>
  );
}

/* ---------- Ring (single progress value) ---------- */

export function Ring({ value, size = 120, thickness = 12, color = C.blue, children }: {
  value: number;
  size?: number;
  thickness?: number;
  color?: string;
  children?: ReactNode;
}) {
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.track} strokeWidth={thickness} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${(value / 100) * circ} ${circ}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="donut-center">{children}</div>
    </div>
  );
}

/* ---------- Bars ---------- */

const masteryColor = (v: number) => (v >= 80 ? C.blue : v >= 70 ? C.peri : C.watch);

export function MasteryBars({ items, showPrev = true }: {
  items: { concept: string; value: number; prev?: number; note?: string }[];
  showPrev?: boolean;
}) {
  return (
    <div className="mastery-bars">
      {items.map((m) => {
        const delta = m.prev !== undefined ? m.value - m.prev : 0;
        return (
          <div key={m.concept} className="mbar">
            <div className="mbar-top">
              <span className="mbar-label">{m.concept}</span>
              <span className="mbar-value">
                {showPrev && m.prev !== undefined && Math.abs(delta) >= 2 && (
                  <em className={delta > 0 ? 'up' : 'down'}>{delta > 0 ? '+' : ''}{delta}</em>
                )}
                {m.value}%
              </span>
            </div>
            <div className="mbar-track">
              <div className="mbar-fill" style={{ width: `${m.value}%`, background: masteryColor(m.value) }} />
              {showPrev && m.prev !== undefined && <div className="mbar-prev" style={{ left: `${m.prev}%` }} title={`Two weeks ago: ${m.prev}%`} />}
            </div>
            {m.note && <div className="mbar-note">{m.note}</div>}
          </div>
        );
      })}
    </div>
  );
}

export function StackedColumns({ columns, keys, height = 160 }: {
  columns: { label: string; title?: string; values: number[] }[];
  keys: { label: string; color: string }[];
  height?: number;
}) {
  const max = Math.max(...columns.map((c) => c.values.reduce((s, v) => s + v, 0)), 1);
  return (
    <div className="stacked">
      <div className="legend">
        {keys.map((k) => <span key={k.label}><i style={{ background: k.color }} />{k.label}</span>)}
      </div>
      <div className="stacked-cols" style={{ height }}>
        {columns.map((c) => {
          const total = c.values.reduce((s, v) => s + v, 0);
          return (
            <div key={c.label} className="stacked-col" title={`${c.title ?? c.label}: ${c.values.map((v, i) => `${v} ${keys[i].label.toLowerCase()}`).join(', ')}`}>
              <div className="stacked-bar" style={{ height: `${(total / max) * 100}%` }}>
                {c.values.map((v, i) => v > 0 && (
                  <div key={i} style={{ flexGrow: v, background: keys[i].color }} />
                ))}
              </div>
              <span className="stacked-label">{c.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Columns({ values, labels, height = 120, highlightLast = true, baseline }: {
  values: number[];
  labels: string[];
  height?: number;
  highlightLast?: boolean;
  baseline?: number;
}) {
  const max = Math.max(...values, baseline ?? 0, 1);
  return (
    <div className="columns" style={{ height }}>
      {baseline !== undefined && (
        <div className="columns-baseline" style={{ bottom: `calc(${(baseline / max) * 100}% * (1 - 22 / ${height}) + 22px)` }}>
          <span>Usual</span>
        </div>
      )}
      {values.map((v, i) => (
        <div key={labels[i]} className="column" title={`${labels[i]}: ${v}`}>
          <div className="column-bar-wrap">
            <div
              className="column-bar"
              style={{ height: `${(v / max) * 100}%`, background: highlightLast && i === values.length - 1 ? C.blue : C.peri }}
            />
          </div>
          <span className="stacked-label">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

export function RiskBar({ onTrack, watch, high }: { onTrack: number; watch: number; high: number }) {
  return (
    <div className="riskbar" aria-hidden>
      <div style={{ flexGrow: onTrack, background: C.blue }} />
      <div style={{ flexGrow: watch, background: C.watch }} />
      <div style={{ flexGrow: high, background: C.high }} />
    </div>
  );
}
