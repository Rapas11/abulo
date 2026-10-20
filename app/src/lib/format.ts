/** Small display helpers shared by screens. */

const DAY_MS = 24 * 60 * 60 * 1000;

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const time = date.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });

  if (timestamp >= startOfToday) return `Today, ${time}`;
  if (timestamp >= startOfToday - DAY_MS) return `Yesterday, ${time}`;
  return `${date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}, ${time}`;
}

export function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
