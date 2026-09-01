/**
 * The number on the app icon.
 *
 * The Badging API is only there in an installed app — on Android/Chrome and on
 * iOS 16.4+ once added to the Home Screen — and it throws or is simply missing
 * everywhere else. Every call is guarded, because a badge is a nicety and must
 * never be able to break a page that was only trying to render a list.
 *
 * The badge set here persists after the app is closed, which is the point: it
 * is what makes "something is on you today" visible without opening anything.
 * The service worker sets it too, from a push, so it stays right while the app
 * is not running.
 */

/** True when this browser can actually show one. */
export function badgeSupported(): boolean {
  return typeof navigator !== "undefined" && "setAppBadge" in navigator;
}

export function setBadge(count: number) {
  if (typeof navigator === "undefined") return;
  // The types declare these as always present; most browsers disagree.
  try {
    if (count > 0) navigator.setAppBadge?.(count).catch(() => {});
    else navigator.clearAppBadge?.().catch(() => {});
  } catch {
    // Not installed, not supported, or the user has badges switched off.
  }
}

/**
 * Take today's ledger summary out of the notification shade.
 *
 * The daily summary is sent with `requireInteraction`, so it sits there until
 * something removes it. Opening the ledger is that something — leaving a
 * notification saying "2 in the ledger today" on screen while you are looking
 * at the ledger is the kind of thing that makes people turn notifications off.
 */
export async function clearLedgerNotification() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const notes = await reg?.getNotifications({ tag: "ledger-today" });
    notes?.forEach((n) => n.close());
  } catch {
    // No service worker, or no permission. Nothing to clean up.
  }
}
