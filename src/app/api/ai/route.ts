import { apiError, apiSuccess } from "@/shared/types/api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customer_name } = body;

    if (!customer_name) {
      return apiError("customer_name is required", 400);
    }

    return apiSuccess({ draft: "AI draft endpoint ready" });
  } catch {
    return apiError("Failed to generate draft", 500);
  }
}
