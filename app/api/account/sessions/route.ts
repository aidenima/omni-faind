import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/app/api/projects/utils";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions = await prisma.userSession.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastUsedAt: "desc" },
    select: {
      id: true,
      deviceId: true,
      deviceName: true,
      userAgent: true,
      ipAddress: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
    },
  });

  return NextResponse.json({
    sessions: sessions.map((session) => ({
      ...session,
      createdAt: session.createdAt.toISOString(),
      lastUsedAt: session.lastUsedAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId, action, deviceName } = await request
    .json()
    .catch(() => ({ sessionId: null, action: null, deviceName: null }));

  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json(
      { error: "Session id is required." },
      { status: 400 }
    );
  }

  const target = await prisma.userSession.findFirst({
    where: { id: sessionId, userId },
    select: { id: true, deviceId: true },
  });

  if (!target) {
    return NextResponse.json(
      { error: "Session not found." },
      { status: 404 }
    );
  }

  if (action === "rename") {
    if (!deviceName || typeof deviceName !== "string") {
      return NextResponse.json(
        { error: "Device name is required." },
        { status: 400 }
      );
    }
    const safeName = deviceName.trim().slice(0, 60);
    if (!safeName) {
      return NextResponse.json(
        { error: "Device name cannot be empty." },
        { status: 400 }
      );
    }
    if (target.deviceId) {
      await prisma.userSession.updateMany({
        where: { userId, deviceId: target.deviceId },
        data: { deviceName: safeName },
      });
    } else {
      await prisma.userSession.update({
        where: { id: sessionId },
        data: { deviceName: safeName },
      });
    }
    return NextResponse.json({ ok: true });
  }

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const recentRevokes = await prisma.userSession.count({
    where: { userId, revokedAt: { gte: oneWeekAgo } },
  });

  if (recentRevokes >= 1) {
    return NextResponse.json(
      {
        error:
          "You can remove only one device per 7-day period. Try again later or keep existing sessions active.",
      },
      { status: 429 }
    );
  }

  const alreadyRevoked = await prisma.userSession.findFirst({
    where: { id: sessionId, revokedAt: { not: null } },
    select: { id: true },
  });

  if (alreadyRevoked) {
    return NextResponse.json({ ok: true });
  }

  await prisma.userSession.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
