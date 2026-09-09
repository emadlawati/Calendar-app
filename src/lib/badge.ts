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
 * Keep today's ledger summary in the notification shade, all day, for as long
 * as anything is still on you.
 *
 * A notification does not have to come from the server. The page can post one
 * through the service worker registration, and that is what makes this work
 * for a task you set yourself: there is no push in that case, because there is
 * nobody to push to — you already know, so the server says nothing. Which
 * meant your own tasks never appeared at all.
 *
 * Posted with the same tag as the morning summary, so the two replace each
 * other instead of stacking, and silently, so re-posting it every time the app
 * opens does not buzz. It clears itself the moment nothing is outstanding.
 */
export async function syncLedgerNotification(
  count: number,
  items: { title: string; overdue: boolean }[],
) {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const reg = await navigator.serviceWorker?.getRegistration();
    if (!reg) return;

    if (count === 0) {
      (await reg.getNotifications({ tag: "ledger-today" })).forEach((n) => n.close());
      return;
    }

    const overdue = items.filter((i) => i.overdue).length;
    const titles = items.slice(0, 3).map((i) => i.title).join(" · ");
    const more = count > items.length ? ` · and ${count - items.length} more` : "";

    await reg.showNotification(
      count === 1
        ? `📓 Due today: ${items[0]?.title ?? "one thing"}`
        : `📓 ${count} in the ledger today${overdue > 0 ? ` — ${overdue} overdue` : ""}`,
      {
        body: count === 1 ? "From the ledger" : `${titles}${more}`,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192-maskable.png",
        tag: "ledger-today",
        requireInteraction: true,
        silent: true,
        data: { url: "/ledger" },
      },
    );
  } catch {
    // No permission, no service worker, or a browser that will not post from
    // the page. The badge and the drawer count still carry the same fact.
  }
}
