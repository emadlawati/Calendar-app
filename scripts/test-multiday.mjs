// Temporary verification script: mints a session JWT and creates/deletes a
// test multi-day event directly in the DB (no emails, no Google sync).
// Usage: node scripts/test-multiday.mjs create | delete | token
import { SignJWT } from "jose";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

// Load .env manually
const env = {};
for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\r\n]*)"?\s*$/);
  if (m) env[m[1]] = m[2];
}
process.env.DATABASE_URL = process.env.DATABASE_URL || env.DATABASE_URL;

const mode = process.argv[2] || "token";

if (mode === "token") {
  const secret = new TextEncoder().encode(env.GOOGLE_CLIENT_SECRET || "fallback-secret-change-me");
  const token = await new SignJWT({ userId: "Husband", email: env.HUSBAND_EMAIL || "test@test.com" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(secret);
  console.log(token);
  process.exit(0);
}

const prisma = new PrismaClient();

if (mode === "create") {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Muscat" });
  const end = new Date(today + "T00:00:00Z");
  end.setUTCDate(end.getUTCDate() + 2);
  const evt = await prisma.calendarEvent.create({
    data: {
      title: "TEST Multi-day Trip",
      date: new Date(today),
      endDate: end,
      time: "18:00",
      endTime: "14:00",
      category: "trip",
      createdBy: "Husband",
      status: "accepted",
      notes: "verification event — safe to delete",
    },
  });
  console.log(JSON.stringify({ id: evt.id, date: evt.date, endDate: evt.endDate }));
}

if (mode === "delete") {
  const res = await prisma.calendarEvent.deleteMany({ where: { title: "TEST Multi-day Trip" } });
  console.log("deleted:", res.count);
}

await prisma.$disconnect();
