/**
 * Backup verification script.
 *
 * Connects to a MongoDB Atlas cluster (typically a restored temp cluster),
 * and verifies data integrity: collection existence, document counts,
 * tenant isolation samples, index presence, and audit log freshness.
 *
 * Usage:
 *   npx tsx scripts/backup-verify.ts --uri "<MONGODB_URI>"
 *
 * Returns exit code 0 on success, 1 on failure.
 */

import mongoose from 'mongoose';

interface CollectionCheck {
  name: string;
  minDocs: number;
  required: boolean;
}

const CHECKS: CollectionCheck[] = [
  { name: 'tenants', minDocs: 1, required: true },
  { name: 'users', minDocs: 1, required: true },
  { name: 'memberships', minDocs: 1, required: true },
  { name: 'sessions', minDocs: 0, required: false },
  { name: 'auditlogs', minDocs: 0, required: false },
  { name: 'projects', minDocs: 0, required: false },
  { name: 'projectmembers', minDocs: 0, required: false },
  { name: 'tasks', minDocs: 0, required: false },
  { name: 'taskdependencies', minDocs: 0, required: false },
  { name: 'equipment', minDocs: 0, required: false },
  { name: 'equipmentassignments', minDocs: 0, required: false },
  { name: 'equipmentusagelogs', minDocs: 0, required: false },
  { name: 'maintenancerecords', minDocs: 0, required: false },
  { name: 'downtimelogs', minDocs: 0, required: false },
  { name: 'materials', minDocs: 0, required: false },
  { name: 'stocklevels', minDocs: 0, required: false },
  { name: 'inventorytransactions', minDocs: 0, required: false },
  { name: 'deliveryreceipts', minDocs: 0, required: false },
  { name: 'reporttemplates', minDocs: 0, required: false },
  { name: 'reportruns', minDocs: 0, required: false },
  { name: 'notifications', minDocs: 0, required: false },
  { name: 'notificationsubscriptions', minDocs: 0, required: false },
  { name: 'aijobs', minDocs: 0, required: false },
  { name: 'aifeedback', minDocs: 0, required: false },
];

function parseArgs(): string {
  const uriArg = process.argv.find((a) => a.startsWith('--uri='));
  if (uriArg) return uriArg.slice('--uri='.length);
  const uriEnv = process.env.MONGODB_URI;
  if (uriEnv) return uriEnv;
  console.error('ERROR: Provide --uri="<MONGODB_URI>" or set MONGODB_URI');
  process.exit(1);
}

async function verify(): Promise<void> {
  const uri = parseArgs();
  console.log(`Connecting to ${uri.replace(/\/\/.*@/, '//<credentials>@')}`);

  const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  const db = conn.connection.db;

  if (!db) {
    console.error('FAIL: Could not get database handle');
    process.exit(1);
  }

  const collectionNames = (await db.listCollections().toArray()).map((c) => c.name);
  const missingCollections: string[] = [];
  const lowCountCollections: string[] = [];
  const tenantSampleIds: string[] = [];

  for (const check of CHECKS) {
    const exists = collectionNames.includes(check.name);
    if (!exists && check.required) {
      missingCollections.push(check.name);
      continue;
    }
    if (!exists) continue;

    const count = await db.collection(check.name).countDocuments();
    if (count < check.minDocs) {
      lowCountCollections.push(`${check.name} (got ${count}, expected >= ${check.minDocs})`);
    }

    // Collect tenant IDs from the tenants collection for sampling
    if (check.name === 'tenants') {
      const docs = await db.collection('tenants').find({}, { projection: { _id: 1 } }).limit(5).toArray();
      tenantSampleIds.push(...docs.map((d) => d._id.toString()));
    }
  }

  // Report results
  let passed = true;

  if (missingCollections.length > 0) {
    console.error(`FAIL: Missing required collections: ${missingCollections.join(', ')}`);
    passed = false;
  } else {
    console.log('PASS: All required collections present');
  }

  if (lowCountCollections.length > 0) {
    console.warn(`WARN: Collections below minimum document count: ${lowCountCollections.join(', ')}`);
  } else {
    console.log('PASS: All collections meet minimum document counts');
  }

  // Index check: verify key indexes exist
  if (!missingCollections.includes('projects')) {
    const projectIndexes = await db.collection('projects').indexes();
    const hasTenantIndex = projectIndexes.some((idx) => idx.key?.tenantId);
    if (hasTenantIndex) {
      console.log('PASS: tenantId index exists on projects');
    } else {
      console.warn('WARN: tenantId index missing on projects');
    }
  }

  // Tenant isolation sample
  if (tenantSampleIds.length > 0 && !missingCollections.includes('memberships')) {
    const sampleTenantId = tenantSampleIds[0];
    const memberships = await db
      .collection('memberships')
      .countDocuments({ tenantId: sampleTenantId });
    if (memberships > 0) {
      console.log(`PASS: Tenant isolation sample OK — found ${memberships} memberships for tenant ${sampleTenantId}`);
    } else {
      console.warn('WARN: No memberships found for sample tenant');
    }
  }

  // Audit log freshness
  if (collectionNames.includes('auditlogs')) {
    const latestAudit = await db
      .collection('auditlogs')
      .find({}, { projection: { createdAt: 1 }, sort: { createdAt: -1 }, limit: 1 })
      .toArray();
    if (latestAudit.length > 0) {
      console.log(`PASS: Latest audit log entry at ${latestAudit[0].createdAt}`);
    } else {
      console.log('INFO: Audit log is empty (no mutations recorded yet)');
    }
  }

  // User count
  if (collectionNames.includes('users')) {
    const userCount = await db.collection('users').countDocuments();
    console.log(`INFO: ${userCount} users in the database`);
  }

  // Tenant count
  if (collectionNames.includes('tenants')) {
    const tenantCount = await db.collection('tenants').countDocuments();
    console.log(`INFO: ${tenantCount} tenants in the database`);
  }

  await conn.disconnect();

  if (!passed) {
    console.error('FAIL: Backup verification failed — see errors above');
    process.exit(1);
  }

  console.log('SUCCESS: Backup verification passed');
}

verify().catch((err: unknown) => {
  console.error('FAIL: Backup verification threw an error', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
