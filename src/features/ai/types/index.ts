import type { BaseEntity } from "@/shared/types";

export type AIProviderType = "openai" | "deepseek" | "gemini";

export interface AIProviderConfig {
  type: AIProviderType;
  apiKey: string;
  model?: string;
}

export interface AIDraftRequest {
  customer_name: string;
  amount_due?: number | null;
  due_date?: string | null;
  notes?: string | null;
  business_context?: string;
  tone?: "professional" | "friendly" | "urgent";
}

export interface AIDraftResponse {
  draft: string;
  provider: AIProviderType;
  model: string;
  generated_at: string;
}

export interface AIUsageRecord extends BaseEntity {
  provider: AIProviderType;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost: number;
}
