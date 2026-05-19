import { apiError, apiSuccess } from "@/shared/types/api";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return apiError("No file provided", 400);
    }

    return apiSuccess({ message: "Upload endpoint ready" });
  } catch {
    return apiError("Failed to process upload", 500);
  }
}
