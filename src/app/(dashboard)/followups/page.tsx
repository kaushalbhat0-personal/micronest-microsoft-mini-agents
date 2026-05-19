import { getOperationalQueue } from "@/features/operations/services/get-operational-queue";
import { OperationalWorkspace } from "@/features/operations/components/operational-workspace";

export default async function FollowupsPage() {
  const queue = await getOperationalQueue();

  return <OperationalWorkspace initialQueue={queue} />;
}
