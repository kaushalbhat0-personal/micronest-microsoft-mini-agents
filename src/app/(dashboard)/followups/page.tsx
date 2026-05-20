import { getOperationalQueue } from "@/features/operations/services/get-operational-queue";
import { getIntelligence } from "@/features/intelligence/actions/get-intelligence";
import { OperationalWorkspace } from "@/features/operations/components/operational-workspace";

export default async function FollowupsPage() {
  const [queue, intelligence] = await Promise.all([
    getOperationalQueue(),
    getIntelligence(),
  ]);

  return (
    <OperationalWorkspace
      initialQueue={queue}
      recommendation={intelligence.recommendation}
      prioritizedItems={intelligence.prioritizedItems}
      intelligenceFeed={intelligence.feedItems}
    />
  );
}
