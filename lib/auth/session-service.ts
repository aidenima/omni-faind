import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const SESSION_TTL_DAYS = 30;
export const MAX_ACTIVE_SESSIONS = 2;
const SESSION_TOKEN_BYTES = 32;

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

const getExpiryDate = () =>
  new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

type SessionMeta = {
  deviceId?: string | null;
  deviceName?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
};

export async function createUserSession(
  userId: string,
  meta: SessionMeta = {}
) {
  if (!userId) {
    throw new Error("Missing userId for session creation");
  }

  const now = new Date();
  const latestDeviceSession = meta.deviceId
    ? await prisma.userSession.findFirst({
        where: {
          userId,
          deviceId: meta.deviceId,
        },
        orderBy: { createdAt: "desc" },
        select: { deviceName: true },
      })
    : null;

  const activeSessions = await prisma.userSession.findMany({
    where: {
      userId,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "asc" },
  });

  // Reuse existing session for the same device if present
  if (meta.deviceId) {
    const existingDeviceSession = activeSessions.find(
      (s) => s.deviceId && s.deviceId === meta.deviceId
    );

    if (existingDeviceSession) {
      const rawToken = randomBytes(SESSION_TOKEN_BYTES).toString("hex");
      const expiresAt = getExpiryDate();
      const updated = await prisma.userSession.update({
        where: { id: existingDeviceSession.id },
        data: {
          tokenHash: hashToken(rawToken),
          expiresAt,
          lastUsedAt: now,
          deviceName:
            meta.deviceName ??
            existingDeviceSession.deviceName ??
            latestDeviceSession?.deviceName ??
            "This device",
          userAgent: meta.userAgent ?? existingDeviceSession.userAgent ?? undefined,
          ipAddress: meta.ipAddress ?? existingDeviceSession.ipAddress ?? undefined,
        },
      });
      return { token: rawToken, session: updated };
    }
  }

  if (activeSessions.length >= MAX_ACTIVE_SESSIONS) {
    throw new Error("DEVICE_LIMIT_EXCEEDED");
  }

  const rawToken = randomBytes(SESSION_TOKEN_BYTES).toString("hex");
  const expiresAt = getExpiryDate();

  const record = await prisma.userSession.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      deviceId: meta.deviceId ?? undefined,
      deviceName:
        meta.deviceName ?? latestDeviceSession?.deviceName ?? "This device",
      userAgent: meta.userAgent ?? undefined,
      ipAddress: meta.ipAddress ?? undefined,
      expiresAt,
    },
  });

  return { token: rawToken, session: record };
}

export async function isDeviceAllowed(
  userId: string,
  deviceId?: string | null
): Promise<boolean> {
  const now = new Date();
  const activeSessions = await prisma.userSession.findMany({
    where: {
      userId,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    select: { id: true, deviceId: true },
  });

  if (deviceId && activeSessions.some((s) => s.deviceId === deviceId)) {
    return true;
  }

  return activeSessions.length < MAX_ACTIVE_SESSIONS;
}

export async function validateSessionToken(
  token: string,
  userId?: string
): Promise<boolean> {
  if (!token) return false;

  const now = new Date();
  const session = await prisma.userSession.findFirst({
    where: {
      tokenHash: hashToken(token),
      ...(userId ? { userId } : {}),
    },
  });

  if (!session) {
    return false;
  }

  const isExpired = session.expiresAt <= now;
  if (session.revokedAt || isExpired) {
    await prisma.userSession.update({
      where: { id: session.id },
      data: { revokedAt: session.revokedAt ?? now },
    });
    return false;
  }

  await prisma.userSession.update({
    where: { id: session.id },
    data: { lastUsedAt: now },
  });

  return true;
}

export async function revokeSessionByToken(token: string) {
  if (!token) return;

  await prisma.userSession.updateMany({
    where: { tokenHash: hashToken(token) },
    data: { revokedAt: new Date() },
  });
}
