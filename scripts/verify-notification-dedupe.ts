/**
 * The standing ledger notification is posted once per change, not once per
 * app open.
 *
 *   npx jiti scripts/verify-notification-dedupe.ts
 *
 * Runs syncLedgerNotification against a fake service-worker registration and
 * counts how many times it actually posts. The bug it guards: on iOS every
 * showNotification is a new notification, and this used to be called on every
 * focus, navigation and visibility change — twelve copies in two minutes.
 */
import { syncLedgerNotification } from "../src/lib/badge";

let pass = 0, fail = 0;
const check = (n: string, ok: boolean, d = "") => {
  ok ? pass++ : fail++;
  console.log(`${ok ? "  ok  " : "  FAIL"}  ${n}${d ? "  — " + d : ""}`);
};

// A browser, as far as the function can tell.
const store = new Map<string, string>();
const shown: { title: string; tag?: string }[] = [];
let live: { tag?: string; close: () => void }[] = [];
const g = globalThis as unknown as Record<string, unknown>;
g.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};
g.Notification = { permission: "granted" };
// Node exposes navigator as a getter-only global; define over it.
Object.defineProperty(globalThis, "navigator", { value: {
  serviceWorker: {
    getRegistration: async () => ({
      getNotifications: async ({ tag }: { tag?: string } = {}) => live.filter((n) => !tag || n.tag === tag),
      showNotification: async (title: string, opts: { tag?: string }) => {
        shown.push({ title, tag: opts.tag });
        const n = { tag: opts.tag, close: () => { live = live.filter((x) => x !== n); } };
        live.push(n);
      },
    }),
  },
}, configurable: true });

const one = [{ title: "Book the dentist", overdue: false }];
const two = [{ title: "Book the dentist", overdue: false }, { title: "Buy stamps", overdue: true }];

console.log("\nOpening the app repeatedly with nothing changed");
for (let i = 0; i < 12; i++) await syncLedgerNotification(1, one);
check("twelve refreshes post once", shown.length === 1, `${shown.length} posted`);
check("and one notification is live", live.length === 1, `${live.length} live`);

console.log("\nThe list changes");
await syncLedgerNotification(2, two);
check("a real change posts again", shown.length === 2, `${shown.length} posted`);
check("the old one is closed first, so only one is live", live.length === 1, `${live.length} live`);
check("the new one carries the new count", shown[1].title.includes("2 in the ledger"), shown[1].title);

console.log("\nBack and forth again");
for (let i = 0; i < 6; i++) await syncLedgerNotification(2, two);
check("still no extra posts", shown.length === 2, `${shown.length} posted`);

console.log("\nEverything is ticked off");
await syncLedgerNotification(0, []);
check("the notification is closed", live.length === 0, `${live.length} live`);
check("the memory of it is cleared", !store.has("ledger-notification-posted"));

console.log("\nSomething new is added later");
await syncLedgerNotification(1, one);
check("it posts afresh", shown.length === 3, `${shown.length} posted`);

console.log("\nA new day");
store.set("ledger-notification-posted", "2000-01-01|1|Book the dentist");
await syncLedgerNotification(1, one);
check("yesterday's memory does not block today's", shown.length === 4, `${shown.length} posted`);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
