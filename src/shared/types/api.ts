export type ApiResponse<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; code?: string };

export type ApiHandler = (
  request: Request,
  context: { params: Promise<Record<string, string>> }
) => Promise<Response>;

export function apiSuccess<T>(data: T, message?: string): Response {
  return Response.json({ success: true, data, message } satisfies ApiResponse<T>, {
    status: 200,
  });
}

export function apiError(error: string, status = 400, code?: string): Response {
  return Response.json(
    { success: false, error, code } satisfies ApiResponse,
    { status }
  );
}
