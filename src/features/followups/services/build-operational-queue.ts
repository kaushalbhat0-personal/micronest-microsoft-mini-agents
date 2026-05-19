import type { OperationalQueue, OperationalQueueItem } from "@/features/followups/types";

export function buildOperationalQueue(items: OperationalQueueItem[]): OperationalQueue {
  const queue: OperationalQueue = {
    highPriority: [],
    mediumPriority: [],
    lowPriority: [],
  };

  for (const item of items) {
    switch (item.candidate.priority) {
      case "high":
        queue.highPriority.push(item);
        break;
      case "medium":
        queue.mediumPriority.push(item);
        break;
      case "low":
        queue.lowPriority.push(item);
        break;
    }
  }

  for (const tier of [queue.highPriority, queue.mediumPriority, queue.lowPriority]) {
    tier.sort((a, b) => (b.contact.due_amount ?? 0) - (a.contact.due_amount ?? 0));
  }

  return queue;
}
