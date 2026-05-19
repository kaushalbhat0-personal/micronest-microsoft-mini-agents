"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Inbox } from "lucide-react";
import { FollowupCard } from "./followup-card";
import { ContactDetailDrawer } from "@/features/timeline/components/contact-detail-drawer";
import type { OperationalQueue, OperationalQueueItem } from "@/features/followups/types";

interface FollowupQueueProps {
  queue: OperationalQueue;
}

function PrioritySection({
  title,
  items,
  onAction,
  onOpenDetail,
}: {
  title: string;
  items: OperationalQueue["highPriority"];
  onAction: () => void;
  onOpenDetail: (item: OperationalQueueItem) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium">{title}</h3>
        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {items.length}
        </span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <FollowupCard
            key={item.candidate.id}
            item={item}
            onAction={onAction}
            onOpenDetail={() => onOpenDetail(item)}
          />
        ))}
      </div>
    </div>
  );
}

export function FollowupQueue({ queue }: FollowupQueueProps) {
  const router = useRouter();
  const [detailItem, setDetailItem] = useState<OperationalQueueItem | null>(null);
  const onAction = useCallback(() => router.refresh(), [router]);

  const { highPriority, mediumPriority, lowPriority } = queue;
  const total = highPriority.length + mediumPriority.length + lowPriority.length;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Inbox className="size-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold">No pending follow-ups</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a spreadsheet and confirm the import to generate follow-up candidates.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">Follow-up Queue</h2>
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{total} pending</span>
          </div>
        </div>

        <div className="space-y-6">
          <PrioritySection
            title="High Priority"
            items={highPriority}
            onAction={onAction}
            onOpenDetail={setDetailItem}
          />
          <PrioritySection
            title="Medium Priority"
            items={mediumPriority}
            onAction={onAction}
            onOpenDetail={setDetailItem}
          />
          <PrioritySection
            title="Low Priority"
            items={lowPriority}
            onAction={onAction}
            onOpenDetail={setDetailItem}
          />
        </div>
      </div>

      {detailItem && (
        <ContactDetailDrawer
          item={detailItem}
          isOpen
          onClose={() => setDetailItem(null)}
          onAction={onAction}
        />
      )}
    </>
  );
}
