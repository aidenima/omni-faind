// Copy data from local Postgres to Supabase using two Prisma clients.
// Usage:
//   LOCAL_DATABASE_URL="postgresql://..." DATABASE_URL="postgresql://..." node scripts/copy-data-to-supabase.js
// Notes:
// - Only copies data (no schema changes). Run Prisma migrations first on Supabase.
// - Uses createMany with skipDuplicates; existing rows (same primary key) are skipped.
// - Order is important to satisfy foreign keys: Users -> Projects -> SearchHistory -> ScreeningHistory -> Coupon -> UserSession.

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const sourceUrl =
  process.env.LOCAL_DATABASE_URL ||
  process.env.DATABASE_LOCAL_URL ||
  process.env.DATABASE_LOCAL ||
  "postgresql://postgres:postgres@localhost:5432/omnifaind?schema=public";

const targetUrl = process.env.DATABASE_URL;

if (!targetUrl) {
  console.error("DATABASE_URL is required for destination (Supabase).");
  process.exit(1);
}

const source = new PrismaClient({ datasources: { db: { url: sourceUrl } } });
const target = new PrismaClient({ datasources: { db: { url: targetUrl } } });

const copyTable = async (label, fetchFn, insertFn) => {
  const rows = await fetchFn();
  if (!rows.length) {
    console.log(`[${label}] no rows to copy`);
    return;
  }
  await insertFn(rows);
  console.log(`[${label}] copied ${rows.length} row(s)`);
};

const run = async () => {
  try {
    // Users
    await copyTable(
      "User",
      () => source.user.findMany({}),
      (rows) =>
        target.user.createMany({
          data: rows,
          skipDuplicates: true,
        })
    );

    // Projects
    await copyTable(
      "Project",
      () => source.project.findMany({}),
      (rows) =>
        target.project.createMany({
          data: rows,
          skipDuplicates: true,
        })
    );

    // SearchHistory
    await copyTable(
      "SearchHistory",
      () => source.searchHistory.findMany({}),
      (rows) =>
        target.searchHistory.createMany({
          data: rows,
          skipDuplicates: true,
        })
    );

    // ScreeningHistory
    await copyTable(
      "ScreeningHistory",
      () => source.screeningHistory.findMany({}),
      (rows) =>
        target.screeningHistory.createMany({
          data: rows,
          skipDuplicates: true,
        })
    );

    // Coupon
    await copyTable(
      "Coupon",
      () => source.coupon.findMany({}),
      (rows) =>
        target.coupon.createMany({
          data: rows,
          skipDuplicates: true,
        })
    );

    // UserSession
    if (source.userSession && target.userSession) {
      await copyTable(
        "UserSession",
        () => source.userSession.findMany({}),
        (rows) =>
          target.userSession.createMany({
            data: rows,
            skipDuplicates: true,
          })
      );
    }

    console.log("Data copy completed.");
  } catch (error) {
    console.error("Data copy failed:", error);
    process.exit(1);
  } finally {
    await source.$disconnect();
    await target.$disconnect();
  }
};

run();
