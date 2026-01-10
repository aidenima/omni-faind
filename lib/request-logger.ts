import type { NextRequest } from "next/server";
import { getClientIp } from "@/lib/request-utils";

type ApiLogContext = {
  request: NextRequest;
  route: string;
  status: number;
  durationMs: number;
  userId?: string | null;
};

export const logApiRequest = ({
  request,
  route,
  status,
  durationMs,
  userId,
}: ApiLogContext) => {
  const ip = getClientIp(request);
  const path = request.nextUrl.pathname;
  const method = request.method;
  const actor = userId ?? "anon";
  console.info(
    `[api] ${method} ${path} ${status} ${durationMs}ms ip=${ip} user=${actor} route=${route}`
  );
};
