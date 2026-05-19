import type { OperationalQueueItem } from "@/features/followups/types";

export interface ScoredItem {
  item: OperationalQueueItem;
  score: number;
}

export function prioritizeQueue(items: OperationalQueueItem[]): OperationalQueueItem[] {
  const scored: ScoredItem[] = items.map((item) => ({
    item,
    score: calculateScore(item),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.map((s) => s.item);
}

function calculateScore(item: OperationalQueueItem): number {
  const { candidate, contact } = item;
  let score = 0;

  if (candidate.priority === "high") score += 1000;
  else if (candidate.priority === "medium") score += 500;
  else score += 100;

  if (contact.due_amount !== null) {
    const amountScore = Math.min(contact.due_amount / 1000, 500);
    score += amountScore;
  }

  if (contact.due_date) {
    const dueDate = new Date(contact.due_date);
    const now = new Date();
    const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / 86400000);
    if (daysOverdue > 0) {
      score += Math.min(daysOverdue * 5, 300);
    }
  }

  if (candidate.candidate_status === "responded") score += 200;
  else if (candidate.candidate_status === "promised") score += 150;

  if (candidate.candidate_status === "contacted") score -= 50;

  if (item.lastAttempt) {
    const hoursSinceAttempt =
      (Date.now() - new Date(item.lastAttempt.created_at).getTime()) / 3600000;
    if (hoursSinceAttempt < 24) score -= 100;
  }

  return score;
}
