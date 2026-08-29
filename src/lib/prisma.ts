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

function scopedClient() {
  return basePrisma().$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !TENANT_MODELS.has(model)) return query(args)

          const coupleId = await requireCouple(model, operation)
          const a = (args ?? {}) as Record<string, unknown>
          // Prisma's per-operation arg types are far narrower than this
          // generic handler can express, so the shape is rebuilt loosely and
          // handed back through a single cast.
          const run = (next: Record<string, unknown>) => query(next as typeof args)
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
