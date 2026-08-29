"use client";

/**
 * Shrink a photo before it is uploaded.
 *
 * Vercel rejects any request body over 4.5 MB at the platform edge, before the
 * upload route runs at all — it comes back as FUNCTION_PAYLOAD_TOO_LARGE, and
 * the app only ever said "upload failed". Phone photos pass that mark often,
 * which is why some pictures never arrived.
 *
 * So the browser does the resizing. A 2000px long edge at quality 0.82 is
 * indistinguishable on a phone screen and lands almost everything under a
 * megabyte, which is also why the memory wall loads faster afterwards.
 */

/** Comfortably under the 4.5 MB limit, leaving room for multipart overhead. */
export const UPLOAD_CEILING = 3.5 * 1024 * 1024;

const MAX_EDGE = 2000;
const QUALITIES = [0.82, 0.7, 0.6, 0.5];

export interface CompressResult {
  file: File;
  originalBytes: number;
  bytes: number;
  /** False when the image could not be decoded and the original is returned. */
  compressed: boolean;
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

export async function compressImage(file: File): Promise<CompressResult> {
  const originalBytes = file.size;

  // Small enough already, and a format the server accepts — leave it alone
  // rather than re-encoding and losing quality for nothing.
  if (originalBytes <= 1024 * 1024 && file.type !== "image/heic") {
    return { file, originalBytes, bytes: originalBytes, compressed: false };
  }

  let bitmap: ImageBitmap;
  try {
    // createImageBitmap applies EXIF orientation, so portrait photos don't
    // come out sideways the way a raw <img> draw would leave them.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // A format this browser cannot decode (some HEIC). Send it as it is and
    // let the size check give an honest message.
    return { file, originalBytes, bytes: originalBytes, compressed: false };
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return { file, originalBytes, bytes: originalBytes, compressed: false };
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // Step the quality down only as far as it needs to go.
  for (const quality of QUALITIES) {
    const blob = await canvasToBlob(canvas, quality);
    if (!blob) break;
    if (blob.size <= UPLOAD_CEILING || quality === QUALITIES[QUALITIES.length - 1]) {
      const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
      return {
        file: new File([blob], name, { type: "image/jpeg", lastModified: Date.now() }),
        originalBytes,
        bytes: blob.size,
        compressed: true,
      };
    }
  }

  return { file, originalBytes, bytes: originalBytes, compressed: false };
}

export const readableSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export interface UploadOutcome {
  urls: string[];
  failures: { name: string; reason: string }[];
}

/**
 * Upload photos one at a time, reporting each result.
 *
 * Promise.all was throwing away every successful upload in a batch as soon as
 * one failed, so adding four photos where one was too large left you with
 * none of them and a message that explained nothing.
 */
export async function uploadPhotos(files: File[]): Promise<UploadOutcome> {
  const urls: string[] = [];
  const failures: { name: string; reason: string }[] = [];

  for (const original of files) {
    try {
      const { file, bytes } = await compressImage(original);

      if (bytes > UPLOAD_CEILING) {
        failures.push({
          name: original.name,
          reason: `still ${readableSize(bytes)} after resizing — too large to send`,
        });
        continue;
      }

      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: form,
        credentials: "same-origin",
      });

      if (!res.ok) {
        // 413 is the platform, not the route: it never reached our code.
        const reason =
          res.status === 413
            ? `too large for the server (${readableSize(bytes)})`
            : res.status === 401
              ? "you have been signed out"
              : (await res.json().catch(() => ({}))).error || `upload failed (${res.status})`;
        failures.push({ name: original.name, reason });
        continue;
      }

      const { url } = await res.json();
      urls.push(url);
    } catch {
      failures.push({ name: original.name, reason: "could not be read" });
    }
  }

  return { urls, failures };
}
