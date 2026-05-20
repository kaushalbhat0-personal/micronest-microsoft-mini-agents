import type { IntelligenceFeedItem } from "@/features/intelligence/types";

export function buildFeedItem(params: {
  type: string;
  message: string;
  severity: "info" | "warning" | "critical";
  contactId?: string;
  operatorId?: string;
}): IntelligenceFeedItem {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: params.type,
    message: params.message,
    severity: params.severity,
    contactId: params.contactId,
    operatorId: params.operatorId,
    timestamp: new Date().toISOString(),
  };
}

const MAX_FEED = 200;
const feed: IntelligenceFeedItem[] = [];

export function pushFeedItem(item: IntelligenceFeedItem): void {
  feed.unshift(item);
  if (feed.length > MAX_FEED) feed.pop();
}

export function getFeed(count = 50): IntelligenceFeedItem[] {
  return feed.slice(0, count);
}

export function clearFeed(): void {
  feed.length = 0;
}

export function getFeedByType(type: string): IntelligenceFeedItem[] {
  return feed.filter((f) => f.type === type);
}
