#!/usr/bin/env node
/**
 * Seeds Cloudflare D1 by:
 *   1. Running the TypeScript seed against local SQLite (dev.db)
 *   2. Exporting all data from dev.db as SQL INSERT statements
 *   3. Executing those statements against D1 via wrangler
 *
 * Prerequisites:
 *   - npm run db:migrate    (creates dev.db schema)
 *   - node scripts/d1-migrate.js --remote  (schema applied to D1)
 *   - wrangler login
 *
 * Usage:
 *   node scripts/d1-seed.js [--local]
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const isLocal = process.argv.includes('--local');
const flag = isLocal ? '--local' : '--remote';
const backendDir = path.join(__dirname, '..');
const sqlFile = path.join(backendDir, 'prisma', 'd1-seed.sql');

// Step 1: Run the Prisma seed against local SQLite
console.log('Step 1: Seeding local SQLite (dev.db)...');
try {
  execSync('npx ts-node prisma/seed.ts', { stdio: 'inherit', cwd: backendDir });
} catch (err) {
  console.error('Seed failed. Make sure "npm run db:migrate" has been run.');
  process.exit(1);
}

// Step 2: Export to SQL using sqlite3 CLI or better-sqlite3
console.log('\nStep 2: Exporting dev.db to SQL...');

// Try using sqlite3 CLI
const sqlite3Available = spawnSync('which', ['sqlite3']).status === 0;

if (sqlite3Available) {
  execSync(`sqlite3 prisma/dev.db .dump > "${sqlFile}"`, {
    stdio: ['inherit', 'pipe', 'inherit'],
    cwd: backendDir,
    shell: true,
  });
  console.log(`  Exported to ${sqlFile}`);
} else {
  // Fallback: use better-sqlite3 if available, otherwise guide user
  try {
    const Database = require('better-sqlite3');
    const db = new Database(path.join(backendDir, 'prisma', 'dev.db'), { readonly: true });
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'")
      .all()
      .map((r) => r.name);

    let sql = 'PRAGMA foreign_keys=OFF;\nBEGIN TRANSACTION;\n\n';
    for (const table of tables) {
      const rows = db.prepare(`SELECT * FROM "${table}"`).all();
      for (const row of rows) {
        const cols = Object.keys(row).map((c) => `"${c}"`).join(', ');
        const vals = Object.values(row)
          .map((v) => {
            if (v === null) return 'NULL';
            if (typeof v === 'number') return String(v);
            return `'${String(v).replace(/'/g, "''")}'`;
          })
          .join(', ');
        sql += `INSERT INTO "${table}" (${cols}) VALUES (${vals});\n`;
      }
    }
    sql += '\nCOMMIT;\nPRAGMA foreign_keys=ON;\n';
    fs.writeFileSync(sqlFile, sql);
    console.log(`  Exported to ${sqlFile}`);
    db.close();
  } catch (e) {
    console.error('\nsqlite3 CLI not found and better-sqlite3 not installed.');
    console.error('To export the seed, install sqlite3:');
    console.error('  macOS: brew install sqlite');
    console.error('  Ubuntu: sudo apt install sqlite3');
    console.error('Then re-run this script.');
    process.exit(1);
  }
}

// Step 3: Apply to D1 via wrangler
console.log(`\nStep 3: Applying seed SQL to D1 (${flag})...`);
try {
  execSync(
    `wrangler d1 execute service_scheduler --file "${sqlFile}" ${flag}`,
    { stdio: 'inherit', cwd: backendDir }
  );
  console.log('\n✓ D1 seeded successfully!');
} catch (err) {
  console.error('\n✗ wrangler execute failed. Check the output above.');
  process.exit(1);
}
