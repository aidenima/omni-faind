import { handlers } from "@/auth";

export const { GET, POST } = handlers;

// Force Node.js runtime because Prisma is not edge-compatible
export const runtime = "nodejs";
