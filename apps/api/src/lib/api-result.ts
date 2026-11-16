export type ApiResult = {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
};

export function errorResult(status: number, message: string, headers?: Record<string, string>): ApiResult {
  return { status, body: { error: message }, headers };
}
