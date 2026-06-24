import prisma from "./prisma";
import type { CommentTarget } from "./types";

/**
 * Returns the creator ("Wife" | "Husband") of a memory or highlight,
 * or null if it doesn't exist. Used to enforce that only the partner
 * (non-owner) may react or comment on a piece of content.
 */
export async function getTargetOwner(
  targetType: CommentTarget,
  targetId: string,
): Promise<string | null> {
  if (targetType === "memory") {
    const m = await prisma.memory.findUnique({ where: { id: targetId }, select: { createdBy: true } });
    return m?.createdBy ?? null;
  }
  const h = await prisma.dailyHighlight.findUnique({ where: { id: targetId }, select: { createdBy: true } });
  return h?.createdBy ?? null;
}
