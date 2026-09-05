#!/usr/bin/env node
//
// Purge print-job files from the object store once they are no longer needed.
//
//   node scripts/cleanupStorage.js            dry run - prints what it WOULD delete
//   node scripts/cleanupStorage.js --apply    actually deletes
//   node scripts/cleanupStorage.js --verbose  list every object and its verdict
//
// Walks the bucket rather than the jobs table, so it only ever considers files
// that still exist (each run gets cheaper) and it also catches orphaned objects
// whose DB row is gone. Job rows are never touched - admin reporting and revenue
// history depend on them. Only the stored file is removed.
//
// Retention windows are read from api/.env, all in days:
//   RETENTION_USED_DAYS      default 7    printed, file has served its purpose
//   RETENTION_PAID_DAYS      default 90   paid but not yet printed - see warning below
//   RETENTION_PENDING_DAYS   default 3    never paid, abandoned upload
//   RETENTION_ORPHAN_DAYS    default 30   no matching row in jobs

// Anchor the env file to the script's own location rather than the working
// directory, so this behaves identically under cron from any cwd.
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const {
  ListObjectsV2Command,
  DeleteObjectsCommand
} = require("@aws-sdk/client-s3");

const s3 = require("../config/storage");
const pool = require("../config/db");

const BUCKET = process.env.S3_BUCKET;
const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 1000;

const APPLY = process.argv.includes("--apply");
const VERBOSE = process.argv.includes("--verbose");

function retentionDays(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;

  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${name} must be a non-negative number of days, got "${raw}"`);
  }
  return n;
}

// Populated in main() so a bad value reports cleanly instead of throwing a raw
// stack trace out of module load, which is all a cron mail would show.
let RETENTION;

// Objects are stored as `<8-digit code>-<filename>` (job.service.js).
const KEY_PATTERN = /^(\d{8})-/;

function ageInDays(from, now) {
  if (!from) return null;
  const ms = now - new Date(from).getTime();
  return Number.isFinite(ms) ? ms / DAY_MS : null;
}

// Decide the fate of one object. Returns { deletable, reason }.
function decide(obj, job, now) {
  if (!job) {
    const age = ageInDays(obj.LastModified, now);
    return age !== null && age >= RETENTION.ORPHAN
      ? { deletable: true, reason: `orphan, no job row, ${age.toFixed(1)}d old` }
      : { deletable: false, reason: "orphan, within retention" };
  }

  // Prefer the timestamp that marks the end of the file's usefulness, and fall
  // back to created_at when it is missing (older rows, manual status edits).
  const spec = {
    USED: { since: job.printed_at || job.created_at, keep: RETENTION.USED },
    PAID: { since: job.paid_at || job.created_at, keep: RETENTION.PAID },
    PENDING: { since: job.created_at, keep: RETENTION.PENDING }
  }[job.status];

  if (!spec) {
    return { deletable: false, reason: `unknown status ${job.status}` };
  }

  const age = ageInDays(spec.since, now);
  if (age === null) {
    return { deletable: false, reason: `${job.status}, no usable timestamp` };
  }

  return age >= spec.keep
    ? { deletable: true, reason: `${job.status} ${age.toFixed(1)}d > ${spec.keep}d` }
    : { deletable: false, reason: `${job.status} ${age.toFixed(1)}d < ${spec.keep}d` };
}

async function loadJobs(codes) {
  if (!codes.length) return new Map();

  const { rows } = await pool.query(
    `SELECT code, status, created_at, paid_at, printed_at
     FROM jobs
     WHERE code = ANY($1::text[])`,
    [codes]
  );

  return new Map(rows.map(r => [r.code, r]));
}

async function deleteBatch(keys) {
  // DeleteObjects caps at 1000 keys per call.
  for (let i = 0; i < keys.length; i += PAGE_SIZE) {
    const chunk = keys.slice(i, i + PAGE_SIZE);

    const res = await s3.send(new DeleteObjectsCommand({
      Bucket: BUCKET,
      Delete: { Objects: chunk.map(Key => ({ Key })), Quiet: true }
    }));

    if (res.Errors && res.Errors.length) {
      for (const e of res.Errors) {
        console.error(`  ! failed to delete ${e.Key}: ${e.Code} ${e.Message}`);
      }
    }
  }
}

function humanBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

async function main() {
  if (!BUCKET) throw new Error("S3_BUCKET is not set");

  RETENTION = {
    USED: retentionDays("RETENTION_USED_DAYS", 7),
    PAID: retentionDays("RETENTION_PAID_DAYS", 90),
    PENDING: retentionDays("RETENTION_PENDING_DAYS", 3),
    ORPHAN: retentionDays("RETENTION_ORPHAN_DAYS", 30)
  };

  const now = Date.now();

  console.log(`bucket    ${BUCKET}`);
  console.log(`mode      ${APPLY ? "APPLY - objects will be deleted" : "DRY RUN - nothing will be deleted"}`);
  console.log(
    `retention used=${RETENTION.USED}d paid=${RETENTION.PAID}d ` +
    `pending=${RETENTION.PENDING}d orphan=${RETENTION.ORPHAN}d\n`
  );

  const stats = { scanned: 0, deleted: 0, kept: 0, bytes: 0, byReason: {} };
  const doomed = [];

  let token;
  do {
    const page = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      ContinuationToken: token,
      MaxKeys: PAGE_SIZE
    }));

    const objects = page.Contents || [];
    token = page.IsTruncated ? page.NextContinuationToken : undefined;

    const codes = [...new Set(
      objects.map(o => (o.Key.match(KEY_PATTERN) || [])[1]).filter(Boolean)
    )];
    const jobs = await loadJobs(codes);

    for (const obj of objects) {
      stats.scanned++;

      const code = (obj.Key.match(KEY_PATTERN) || [])[1];
      const { deletable, reason } = decide(obj, code ? jobs.get(code) : null, now);
      const tag = reason.split(",")[0].split(" ")[0];

      if (deletable) {
        doomed.push(obj.Key);
        stats.deleted++;
        stats.bytes += obj.Size || 0;
        stats.byReason[tag] = (stats.byReason[tag] || 0) + 1;
        if (VERBOSE || !APPLY) console.log(`  DELETE ${obj.Key}  (${reason})`);
      } else {
        stats.kept++;
        if (VERBOSE) console.log(`  keep   ${obj.Key}  (${reason})`);
      }
    }
  } while (token);

  if (APPLY && doomed.length) {
    await deleteBatch(doomed);
  }

  console.log(
    `\nscanned ${stats.scanned}  ` +
    `${APPLY ? "deleted" : "would delete"} ${stats.deleted} (${humanBytes(stats.bytes)})  ` +
    `kept ${stats.kept}`
  );

  const breakdown = Object.entries(stats.byReason).map(([k, v]) => `${k}=${v}`).join(" ");
  if (breakdown) console.log(`by reason: ${breakdown}`);

  if (!APPLY && stats.deleted) {
    console.log("\nRe-run with --apply to delete these objects.");
  }
}

main()
  .then(() => pool.end())
  .catch(err => {
    // Connection failures surface as an AggregateError with an empty message,
    // so fall back to the name/code - otherwise cron mail says nothing useful.
    const detail = err.message || [err.name, err.code].filter(Boolean).join(" ") || String(err);
    console.error(`\ncleanup failed: ${detail}`);
    pool.end();
    process.exit(1);
  });
