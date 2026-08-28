import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

/**
 * A row belonging to another couple is simply unreachable through the scoped
 * Prisma client, and Prisma reports that as P2025 ("record not found").
 *
 * Answering 404 does two things: it stops an internal error leaking as a 500,
 * and it makes "this isn't yours" indistinguishable from "this doesn't
 * exist" — so the API never confirms that another couple's id is real.
 */
export function writeErrorResponse(error: unknown, message: string) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2025" || error.code === "P2018")
  ) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }
  console.error(message, error);
  return NextResponse.json({ success: false, error: message }, { status: 500 });
}
