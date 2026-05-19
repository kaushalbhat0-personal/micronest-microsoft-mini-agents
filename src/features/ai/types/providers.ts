import type { AIProviderType, AIDraftRequest, AIDraftResponse } from "./index";

export interface AIProviderInterface {
  readonly type: AIProviderType;
  generateDraft(request: AIDraftRequest): Promise<AIDraftResponse>;
  validateApiKey(): Promise<boolean>;
}
