import type { AIProviderInterface } from "@/features/ai/types/providers";
import type { AIDraftRequest, AIDraftResponse, AIProviderType } from "@/features/ai/types";

export abstract class BaseAIProvider implements AIProviderInterface {
  public readonly type: AIProviderType;
  protected apiKey: string;
  protected model: string;

  constructor(type: AIProviderType, apiKey: string, model: string) {
    this.type = type;
    this.apiKey = apiKey;
    this.model = model;
  }

  abstract generateDraft(request: AIDraftRequest): Promise<AIDraftResponse>;
  abstract validateApiKey(): Promise<boolean>;

  protected buildPrompt(request: AIDraftRequest): string {
    const parts: string[] = [
      `Customer: ${request.customer_name}`,
    ];

    if (request.amount_due != null) {
      parts.push(`Amount Due: ₹${request.amount_due.toLocaleString("en-IN")}`);
    }

    if (request.due_date) {
      parts.push(`Due Date: ${request.due_date}`);
    }

    if (request.notes) {
      parts.push(`Notes: ${request.notes}`);
    }

    const toneInstruction = {
      professional: "Use a professional and courteous tone.",
      friendly: "Use a warm and friendly tone.",
      urgent: "Use an urgent but polite tone emphasizing timely action.",
    }[request.tone ?? "professional"];

    return [
      "Generate a WhatsApp follow-up message for a business reminding a customer about a pending payment or follow-up.",
      "Keep it concise (under 300 characters), natural, and conversational.",
      toneInstruction,
      "Use emojis sparingly and appropriately.",
      "Do not include any links or attachments.",
      "Start with the customer's name.",
      "",
      "Details:",
      ...parts.map((p) => `- ${p}`),
      "",
      "WhatsApp Draft:",
    ].join("\n");
  }
}
