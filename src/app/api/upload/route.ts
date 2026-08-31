import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// Vercel rejects any request body over 4.5 MB at the edge, before this route
// runs — so the old 8 MB limit could never fire and large photos failed with
// an opaque FUNCTION_PAYLOAD_TOO_LARGE. The browser now resizes first; this
// is the backstop, set below the platform ceiling so the message comes from
// here and says something useful.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    // Uploads were only protected by middleware; require a session here too,
    // so the path can be namespaced to the couple that owns the photo.
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image uploads are allowed" }, { status: 415 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "Image is too large — it should have been resized before sending" },
        { status: 413 },
      );
    }

    // One folder per couple, so nobody's photos share a namespace.
    // Note these remain public-with-an-unguessable-URL; signed URLs are the
    // proper fix if this ever grows beyond an invited beta.
    const filename = `memories/${session.coupleId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const blob = await put(filename, file, {
      access: "public",
      contentType: file.type,
    });

    // The app-relative path, never the blob URL. /api/photos checks the
    // session and the owning family before serving the bytes; handing back
    // blob.url would put a permanent, uncontrolled link into the database and
    // into every API response that carries a photo.
    return NextResponse.json({
      url: `/api/photos/${blob.pathname.split("/").map(encodeURIComponent).join("/")}`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
