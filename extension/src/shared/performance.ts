interface PerfMark {
  name: string;
  timestamp: number;
  duration?: number;
}

const marks: PerfMark[] = [];
const MAX_MARKS = 500;

export function mark(name: string): void {
  const existing = marks.findLast((m) => m.name === name && m.duration === undefined);
  if (existing) {
    existing.duration = Date.now() - existing.timestamp;
    return;
  }
  marks.push({ name, timestamp: Date.now() });
  if (marks.length > MAX_MARKS) marks.shift();
}

export function getMarks(name?: string): PerfMark[] {
  if (name) return marks.filter((m) => m.name === name);
  return [...marks];
}

export function getAverageDuration(name: string): number {
  const filtered = marks.filter((m) => m.name === name && m.duration !== undefined);
  if (filtered.length === 0) return 0;
  return filtered.reduce((sum, m) => sum + (m.duration ?? 0), 0) / filtered.length;
}

export function clearMarks(): void {
  marks.length = 0;
}
