import { PrismaClient } from '@prisma/client'
import { AsyncLocalStorage } from 'node:async_hooks'

/**
 * Tenant isolation lives here, and only here.
 *
 * Hand-adding `where: { coupleId }` to ~119 call sites is the classic way to
 * leak data: it only takes one forgotten query. Instead every model operation
 * passes through a Prisma client extension that reads the current couple from
 * AsyncLocalStorage and injects the scope itself.
 *
 *   prisma        — scoped. Throws if used with no couple in context.
 *   systemPrisma  — deliberately unscoped, for cron and sign-in. Grep for it.
 */

/** Models that belong to a couple. Couple/CoupleUser/Invite are not scoped. */
const TENANT_MODELS = new Set([
  'CalendarEvent', 'GoogleCalendarToken', 'Note', 'BucketItem', 'Streak',
  'Achievement', 'Memory', 'RecurringSeries', 'SpecialDate', 'Reminder',
  'DailyHighlight', 'PushSubscription', 'Comment', 'Reaction',
  // FeedToken is resolved by token across families, which only systemPrisma
  // may do. Listing it here means an accidental `prisma.feedToken` fails
  // closed rather than quietly returning every family's links.
  'FeedToken',
  'Task', 'TaskSeries',
])

const READ_OPS = new Set([
  'findMany', 'findFirst', 'findFirstOrThrow', 'count', 'aggregate', 'groupBy',
])
const WHERE_WRITE_OPS = new Set(['updateMany', 'deleteMany'])
const UNIQUE_OPS = new Set(['findUnique', 'findUniqueOrThrow', 'update', 'delete'])

/**
 * Cached alongside the clients, and for the same reason. The extension below
 * closes over this store; if a reload re-evaluates this module while the
 * client survives on globalThis, the two end up looking at different stores
 * and every scoped query fails with "tenant scope missing". Keeping the store
 * on globalThis keeps them the same object.
 */
declare global {
  var __coupleStore: undefined | AsyncLocalStorage<{ coupleId: string }>
}
const store =
  globalThis.__coupleStore ?? new AsyncLocalStorage<{ coupleId: string }>()
if (process.env.NODE_ENV !== 'production') globalThis.__coupleStore = store

/** Run `fn` with every query scoped to this couple. */
export function withCouple<T>(coupleId: string, fn: () => Promise<T>): Promise<T> {
  return store.run({ coupleId }, fn)
}

export function currentCoupleId(): string | undefined {
  return store.getStore()?.coupleId
}

/**
 * Where the scope comes from, in order:
 *   1. an explicit withCouple() — used by cron fan-out and tests
 *   2. the session cookie — the normal request path
 *
 * Deriving it from the session means a route physically cannot forget to
 * scope itself; there is no per-route wiring to omit.
 */
async function resolveCoupleId(): Promise<string | undefined> {
  const explicit = store.getStore()?.coupleId
  if (explicit) return explicit

  try {
    // Dynamic: session.ts pulls in next/headers, which does not exist in
    // plain Node scripts. Those use systemPrisma or withCouple() instead.
    const { getSessionCoupleId } = await import('./session')
    return await getSessionCoupleId()
  } catch {
    return undefined
  }
}

async function requireCouple(model: string, operation: string): Promise<string> {
  const id = await resolveCoupleId()
  if (!id) {
    throw new Error(
      `Tenant scope missing: ${model}.${operation}() ran with no couple in context. ` +
      `It needs a signed-in session, an explicit withCouple(), or systemPrisma if it is genuinely cross-couple.`,
    )
  }
  return id
}

const basePrisma = () => new PrismaClient()

/**
 * The database role the scoped client works as.
 *
 * Prisma Postgres connects us as `prisma_migration`, a superuser — and
 * superusers bypass row-level security unconditionally, even with FORCE. The
 * platform refuses CREATE ROLE and GRANT, but it already ships this role:
 * not a superuser, no BYPASSRLS, and already holding the privileges these
 * tables need. Dropping into it for the length of each transaction is what
 * makes the policies apply at all.
 */
const RLS_ROLE = 'prisma_application'

function scopedClient() {
  const base = basePrisma()
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !TENANT_MODELS.has(model)) return query(args)

          const coupleId = await requireCouple(model, operation)
          const a = (args ?? {}) as Record<string, unknown>

          /**
           * Every scoped query runs inside one transaction that first drops
           * superuser rights and states which family it is for. Both settings
           * are transaction-local, so a pooled connection cannot carry either
           * of them into the next request — which is exactly the leak that
           * makes session-level settings unsafe here.
           *
           * The injected `where` above and the policy below now say the same
           * thing in two independent places. The application forgetting one is
           * no longer enough to expose a row.
           */
          const run = (next: Record<string, unknown>) =>
            base.$transaction([
              // `role` is an ordinary setting, so dropping privileges and
              // naming the family fit in one statement. Two statements cost a
              // measured extra ~280ms per query against a distant database,
              // which is a lot to pay for nothing.
              base.$executeRaw`SELECT
                set_config('role', ${RLS_ROLE}, TRUE),
                set_config('app.couple_id', ${coupleId}, TRUE)`,
              query(next as typeof args),
            ]).then((r) => r[1])
          const scopedWhere = () => ({ ...(a.where as object), coupleId })

          if (READ_OPS.has(operation) || WHERE_WRITE_OPS.has(operation)) {
            return run({ ...a, where: scopedWhere() })
          }

          // findUnique/update/delete take a unique `where`. Prisma's extended
          // where-uniqueness (GA since v5) allows an extra non-unique filter
          // alongside the unique field, which is exactly what we need — a
          // wrong-couple id then returns null / raises "record not found"
          // rather than touching another couple's row.
          if (UNIQUE_OPS.has(operation)) {
            return run({ ...a, where: scopedWhere() })
          }

          if (operation === 'create') {
            return run({ ...a, data: { ...(a.data as object), coupleId } })
          }

          if (operation === 'createMany') {
            const data = a.data
            return run({
              ...a,
              data: Array.isArray(data)
                ? data.map((d) => ({ ...(d as object), coupleId }))
                : { ...(data as object), coupleId },
            })
          }

          // upsert's `where` must be a compound unique key, which on every
          // tenant model already begins with coupleId — so only `create`
          // needs filling in.
          if (operation === 'upsert') {
            return run({ ...a, create: { ...(a.create as object), coupleId } })
          }

          // Anything unrecognised is scoped by `where` if it has one, rather
          // than silently running unscoped.
          return run(a.where ? { ...a, where: scopedWhere() } : a)
        },
      },
    },
  })
}

declare global {
  var __prismaScoped: undefined | ReturnType<typeof scopedClient>
  var __prismaSystem: undefined | ReturnType<typeof basePrisma>
}

/** Scoped client — the default for all request handling. */
const prisma = globalThis.__prismaScoped ?? scopedClient()

/**
 * Unscoped client. Only for work that is legitimately cross-couple:
 * cron fan-out, sign-in (resolving which couple an email belongs to),
 * invites, and migrations.
 */
export const systemPrisma = globalThis.__prismaSystem ?? basePrisma()

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prismaScoped = prisma
  globalThis.__prismaSystem = systemPrisma
}

export default prisma
