import { z } from "zod";
import { FOLLOWUP_STATUS } from "@/shared/utils/constants";

export const followUpDraftSchema = z.object({
  id: z.string().uuid(),
  draft: z.string().min(1, "Draft cannot be empty").max(1000, "Draft is too long"),
});

export const followUpStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum([
    FOLLOWUP_STATUS.PENDING,
    FOLLOWUP_STATUS.DRAFTED,
    FOLLOWUP_STATUS.SENT,
    FOLLOWUP_STATUS.RESPONDED,
    FOLLOWUP_STATUS.CLOSED,
  ]),
});

export type FollowUpDraftInput = z.infer<typeof followUpDraftSchema>;
export type FollowUpStatusInput = z.infer<typeof followUpStatusSchema>;
