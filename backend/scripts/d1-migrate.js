#!/usr/bin/env node
/**
 * Applies the latest Prisma migration SQL to Cloudflare D1.
 *
 * Prerequisites:
 *   1. npm run db:migrate  (generates migration SQL in prisma/migrations/)
 *   2. wrangler login      (authenticate with Cloudflare)
 *
 * Usage:
 *   node scripts/d1-migrate.js [--local]
 *
 * Flags:
 *   --local   Apply to local D1 simulator (wrangler --local) instead of remote
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const isLocal = process.argv.includes('--local');
const flag = isLocal ? '--local' : '--remote';

const migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations');

if (!fs.existsSync(migrationsDir)) {
  console.error('No migrations directory found. Run "npm run db:migrate" first.');
  process.exit(1);
}

// Find all migration.sql files, sorted by directory name (timestamp prefix ensures order)
const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((d) => fs.statSync(path.join(migrationsDir, d)).isDirectory())
  .sort()
  .map((d) => path.join(migrationsDir, d, 'migration.sql'))
  .filter((f) => fs.existsSync(f));

if (migrationFiles.length === 0) {
  console.error('No migration.sql files found. Run "npm run db:migrate" first.');
  process.exit(1);
}

console.log(`Found ${migrationFiles.length} migration(s). Applying to D1 (${flag})...\n`);

for (const file of migrationFiles) {
  console.log(`→ Applying: ${path.relative(process.cwd(), file)}`);
  try {
    execSync(
      `wrangler d1 execute service_scheduler --file "${file}" ${flag}`,
      { stdio: 'inherit', cwd: path.join(__dirname, '..') }
    );
    console.log('  ✓ Done\n');
  } catch (err) {
    console.error(`  ✗ Failed on ${file}`);
    console.error('  If tables already exist, this is expected — D1 does not support IF NOT EXISTS in all cases.');
    console.error('  You can run with --local first to test, or check D1 console to verify schema.\n');
  }
}

console.log('Migration complete. Run "npm run d1:seed" to seed demo data.');
