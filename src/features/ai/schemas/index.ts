import { z } from "zod";

export const aiProviderConfigSchema = z.object({
  type: z.enum(["openai", "deepseek", "gemini"]),
  apiKey: z.string().min(1, "API key is required"),
  model: z.string().optional(),
});

export const aiDraftRequestSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required"),
  amount_due: z.number().positive().optional().nullable(),
  due_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  business_context: z.string().optional(),
  tone: z.enum(["professional", "friendly", "urgent"]).default("professional"),
});

export type AIProviderConfigInput = z.infer<typeof aiProviderConfigSchema>;
export type AIDraftRequestInput = z.infer<typeof aiDraftRequestSchema>;
