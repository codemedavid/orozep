// Point-in-time JSON backup of every public table in Supabase.
//
// Why this exists: the catalog has been wiped to 0 twice with no audit trail and
// no recoverable log evidence. Until soft-delete + RLS land, an off-Supabase
// snapshot is the only thing standing between an incident and a manual rebuild.
//
//   node scripts/backup_supabase.mjs
//
// Writes backups/<ISO timestamp>/<table>.json. The directory is gitignored:
// `orders` carries customer names, addresses and phone numbers.
import fs from 'node:fs';
import path from 'node:path';

const TABLES = [
  'products',
  'product_variations',
  'categories',
  'orders',
  'reviews',
  'review_products',
  'site_settings',
  'payment_methods',
  'couriers',
  'shipping_locations',
  'promo_codes',
  'faqs',
  'guide_topics',
  'coa_reports',
  'protocols',
];

const PAGE_SIZE = 1000;

function loadEnv() {
  const env = {};
  const raw = fs.readFileSync(new URL('../.env', import.meta.url), 'utf8');
  for (const line of raw.split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) env[match[1]] = match[2].trim();
  }
  return env;
}

async function fetchTable(baseUrl, key, table) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const res = await fetch(`${baseUrl}/rest/v1/${table}?select=*`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Range: `${offset}-${offset + PAGE_SIZE - 1}`,
      },
    });
    if (!res.ok) throw new Error(`${table}: HTTP ${res.status} ${await res.text()}`);
    const page = await res.json();
    if (!Array.isArray(page)) throw new Error(`${table}: ${JSON.stringify(page)}`);
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

const env = loadEnv();
const baseUrl = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;
if (!baseUrl || !key) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.resolve(process.cwd(), 'backups', stamp);
fs.mkdirSync(outDir, { recursive: true });

let total = 0;
const failures = [];
for (const table of TABLES) {
  try {
    const rows = await fetchTable(baseUrl, key, table);
    fs.writeFileSync(path.join(outDir, `${table}.json`), JSON.stringify(rows, null, 2));
    console.log(`  ${table.padEnd(20)} ${String(rows.length).padStart(6)} rows`);
    total += rows.length;
  } catch (err) {
    failures.push(`${table}: ${err.message}`);
    console.error(`  ${table.padEnd(20)} FAILED — ${err.message}`);
  }
}

console.log(`\nBackup written to backups/${stamp} (${total} rows across ${TABLES.length - failures.length} tables)`);
if (failures.length) {
  console.error(`\n${failures.length} table(s) failed:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
