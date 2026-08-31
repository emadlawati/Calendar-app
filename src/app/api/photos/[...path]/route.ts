import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Photos, served only to the family they belong to.
 *
 * Every photo used to be handed out as its Vercel Blob URL. Those are
 * unguessable but not access-controlled, and they never expire — anyone who
 * ever saw a link kept it, for good. That was a decision the two of them could
 * make about their own pictures. It stops being their decision the moment
 * another family's photos are in the same store.
 *
 * Blob has no private mode, so the fix is to stop publishing the URL: the app
 * stores and returns a path, and this route checks the session before
 * streaming the bytes.
 *
 * Ownership is decided by the database, not by the shape of the path. Uploads
 * are namespaced `memories/<coupleId>/…` now, but the photos taken before that
 * change are flat `memories/<file>` — a prefix rule would have quietly 404'd
 * every picture they already had. Asking whether a row in *this* family's
 * scope references the path is both correct for those and general: a photo is
 * yours exactly when something of yours points at it.
 *
 * A photo that has just been uploaded belongs to nothing yet — the modal shows
 * it while you are still typing the note — so the namespaced prefix counts as
 * ownership on its own. Every new upload has it; only the pre-namespacing
 * photos rely on the lookup.
 */

const BASE = process.env.BLOB_PUBLIC_BASE_URL
  ?? "https://hrvn5k9y5phrzjuz.public.blob.vercel-storage.com";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { path } = await params;
  const key = path.map(decodeURIComponent).join("/");
  if (!key.startsWith("memories/") || key.includes("..")) {
    return new NextResponse("Not found", { status: 404 });
  }

  // The string as it is stored, so the match is exact rather than a fuzzy
  // filename comparison across families.
  const stored = `/api/photos/${key.split("/").map(encodeURIComponent).join("/")}`;

  // Uploaded under this family's own folder: theirs, saved or not.
  if (key.startsWith(`memories/${session.coupleId}/`)) return stream(key);

  // Both reads are tenant-scoped, so they can only ever see this family's rows.
  const [inMemory, inHighlight] = await Promise.all([
    prisma.memory.findFirst({ where: { photos: { contains: stored } }, select: { id: true } }),
    prisma.dailyHighlight.findFirst({ where: { photos: { contains: stored } }, select: { id: true } }),
  ]);

  if (!inMemory && !inHighlight) {
    // 404 rather than 403: another family's photo should be indistinguishable
    // from one that does not exist.
    return new NextResponse("Not found", { status: 404 });
  }

  return stream(key);
}

async function stream(key: string) {
  const upstream = await fetch(`${BASE}/${key.split("/").map(encodeURIComponent).join("/")}`);
  if (!upstream.ok || !upstream.body) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Content-Length": upstream.headers.get("content-length") ?? "",
      // Private: a shared cache must never hold one family's photo.
      "Cache-Control": "private, max-age=3600",
    },
  });
}
