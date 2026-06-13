// Deletes ImageKit payment-proof IMAGES for shipped + delivered orders only.
// Does NOT touch the Supabase database in any way (no rows, no columns).
// Dry-run by default. Pass --execute to actually delete.
import fs from 'node:fs';

const execute = process.argv.includes('--execute');

// --- load .env ---
const env = {};
for (const line of fs.readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}
const SUPA = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_ANON_KEY;
const IK_KEY = env.IMAGEKIT_PRIVATE_KEY;
const IK_AUTH = 'Basic ' + Buffer.from(IK_KEY + ':').toString('base64');

const nameFromUrl = (u) => decodeURIComponent(u.split('?')[0].split('/').pop());

// --- fetch order proof URLs from Supabase (paginated) ---
async function fetchProofNames(statuses) {
  const names = new Set();
  let offset = 0;
  const pageSize = 1000;
  for (;;) {
    const url = `${SUPA}/rest/v1/orders?select=payment_proof_url&order_status=in.(${statuses.join(',')})&payment_proof_url=not.is.null`;
    const res = await fetch(url, {
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${ANON}`,
        Range: `${offset}-${offset + pageSize - 1}`,
        Prefer: 'count=exact',
      },
    });
    const rows = await res.json();
    if (!Array.isArray(rows)) throw new Error('Supabase error: ' + JSON.stringify(rows));
    for (const r of rows) if (r.payment_proof_url) names.add(nameFromUrl(r.payment_proof_url));
    if (rows.length < pageSize) break;
    offset += pageSize;
  }
  return names;
}

// --- list ALL files in /payment-proofs (paginated) ---
async function listFolder() {
  const files = [];
  let skip = 0;
  const limit = 1000;
  for (;;) {
    const res = await fetch(
      `https://api.imagekit.io/v1/files?path=payment-proofs&type=file&limit=${limit}&skip=${skip}`,
      { headers: { Authorization: IK_AUTH } }
    );
    const batch = await res.json();
    if (!Array.isArray(batch)) throw new Error('ImageKit list error: ' + JSON.stringify(batch));
    files.push(...batch);
    if (batch.length < limit) break;
    skip += limit;
  }
  return files;
}

async function bulkDelete(fileIds) {
  let deleted = 0;
  for (let i = 0; i < fileIds.length; i += 100) {
    const chunk = fileIds.slice(i, i + 100);
    const res = await fetch('https://api.imagekit.io/v1/files/batch/deleteByFileIds', {
      method: 'POST',
      headers: { Authorization: IK_AUTH, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileIds: chunk }),
    });
    const out = await res.json();
    if (!res.ok) throw new Error('Delete error: ' + JSON.stringify(out));
    deleted += (out.successfullyDeletedFileIds || chunk).length;
    console.log(`  deleted batch ${i / 100 + 1}: ${deleted}/${fileIds.length}`);
  }
  return deleted;
}

(async () => {
  const deleteNames = await fetchProofNames(['shipped', 'delivered']);
  const keepNames = await fetchProofNames(['confirmed', 'cancelled']);
  console.log(`Delete-set (shipped+delivered): ${deleteNames.size} proof URLs`);
  console.log(`Keep-set  (confirmed+cancelled): ${keepNames.size} proof URLs`);

  const files = await listFolder();
  console.log(`ImageKit /payment-proofs folder: ${files.length} files total`);

  const toDelete = [];
  let keptGuard = 0, orphans = 0, freedBytes = 0;
  for (const f of files) {
    if (keepNames.has(f.name)) { keptGuard++; continue; }   // safety: never delete kept orders
    if (deleteNames.has(f.name)) { toDelete.push(f); freedBytes += f.size || 0; }
    else orphans++;                                          // not tied to shipped/delivered -> leave alone
  }

  console.log(`\nMatched for deletion: ${toDelete.length}`);
  console.log(`Protected (confirmed/cancelled present in folder): ${keptGuard}`);
  console.log(`Unmatched/other files left untouched: ${orphans}`);
  console.log(`Space to free: ${(freedBytes / 1048576).toFixed(1)} MB`);

  if (!execute) {
    console.log('\nDRY RUN — nothing deleted. Re-run with --execute to delete.');
    return;
  }
  console.log('\nEXECUTING deletion...');
  const n = await bulkDelete(toDelete.map((f) => f.fileId));
  console.log(`\nDone. Deleted ${n} payment-proof images. Database untouched.`);
})();
