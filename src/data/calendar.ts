/** The demo is frozen at a moment mid-semester so predictions have history behind them. */
export const TERM = { name: 'Fall 2026', weeks: 16, currentWeek: 8 };
export const TODAY_ISO = '2026-10-13';
export const TODAY = parseDate(TODAY_ISO);
export const WEEK_LABELS = Array.from({ length: TERM.weeks }, (_, i) => `W${i + 1}`);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function parseDate(iso: string): Date {
  const [date, time] = iso.split('T');
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = (time ?? '00:00').split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm);
}

export function fmtDate(iso: string): string {
  const d = parseDate(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function daysFromToday(iso: string): number {
  return Math.round((parseDate(iso.split('T')[0]).getTime() - TODAY.getTime()) / 86_400_000);
}

/** "Today", "Tomorrow", "Friday", or "Oct 21". */
export function dueLabel(iso: string): string {
  const diff = daysFromToday(iso);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff > 1 && diff < 7) return DAYS[parseDate(iso).getDay()];
  return fmtDate(iso);
}

export function fmtTime(iso: string): string {
  const d = parseDate(iso);
  const h = d.getHours() % 12 || 12;
  const time = `${h}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
  return daysFromToday(iso) === 0 ? time : `${fmtDate(iso)}, ${time}`;
}

export function longToday(): string {
  return `${DAYS[TODAY.getDay()]}, ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][TODAY.getMonth()]} ${TODAY.getDate()}`;
}

/** Uses the viewer's real clock so the greeting feels natural. */
export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** A timestamp for things the user does during the demo. */
export function nowIso(): string {
  const d = new Date();
  return `${TODAY_ISO}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
