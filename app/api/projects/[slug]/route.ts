import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  findProjectBySlug,
  requireUserId,
  toProjectPayload,
} from "../utils";

type RouteParams = {
  slug: string;
};

type RouteContext = {
  params: Promise<RouteParams> | RouteParams;
};

const resolveSlugParam = async (
  contextParams: RouteContext["params"]
) => {
  if (contextParams instanceof Promise) {
    const resolved = await contextParams;
    return resolved.slug;
  }
  return contextParams.slug;
};

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  const slug = await resolveSlugParam(context.params);
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await findProjectBySlug(userId, slug);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({ project: toProjectPayload(project) });
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  const slug = await resolveSlugParam(context.params);
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await findProjectBySlug(userId, slug);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  await prisma.project.delete({ where: { id: project.id } });
  return NextResponse.json({ success: true });
}
