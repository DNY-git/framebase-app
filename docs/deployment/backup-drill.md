# Backup & Restore Drill

**Phase:** 6 (Hardening) — T-504.

> MongoDB Atlas provides automated cloud backups and point-in-time recovery (PITR) natively. This runbook documents how backups are configured, how to perform a restore drill, and how to verify backup integrity. An untested backup is assumed broken — drills are mandatory before production signoff.

---

## Table of Contents

- [Backup Strategy Overview](#backup-strategy-overview)
- [Atlas Automated Backups](#atlas-automated-backups)
- [Manual Backup (mongodump)](#manual-backup-mongodump)
- [Restore Drill Procedure](#restore-drill-procedure)
- [Backup Verification Checklist](#backup-verification-checklist)
- [Local Development Backups](#local-development-backups)
- [Incident Recovery Playbook](#incident-recovery-playbook)

---

## Backup Strategy Overview

| Layer | Mechanism | RPO | RTO | Notes |
|---|---|---|---|---|
| **Production cluster** | Atlas Cloud Backup (PITR) | ~1 min (PITR window) | ~1-4 hrs (restore to new cluster) | Always-on; no configuration needed |
| **Cross-region** | Atlas Backup snapshots to a 2nd region | Per snapshot schedule | ~4-8 hrs | Prevents region-loss data loss |
| **Pre-deploy safety** | `mongodump` before destructive operations | Manual | N/A | Run before schema migrations or bulk deletes |
| **Local/Dev** | `mongodump` + optional scheduled cron | Per schedule | ~15 min | Seeds, sample data, CI caching |

**RPO (Recovery Point Objective):** Maximum acceptable data loss.  
**RTO (Recovery Time Objective):** Maximum acceptable downtime to restore.

---

## Atlas Automated Backups

### Enabling Cloud Backups

1. In Atlas UI, navigate to your project → **Clusters** → **Backup** tab.
2. Click **Configure** or **Modify**.
3. Enable **Cloud Provider Snapshots** and/or **Continuous Cloud Backup (PITR)**:
   - **PITR** (recommended for production): restores to any second within the last 24 hours (or up to 7 days with extended retention).
   - **Snapshot schedule**: choose frequency (every 6/8/12 hrs) and retention (days/weeks/months).
4. Verify the first snapshot appears within the configured window.

### Retention Policy

| Environment | Snapshots | PITR | Retention |
|---|---|---|---|
| Production | Every 6 hrs | Yes (24h) | Snapshots: 7 days; PITR: 24 hours |
| Staging | Every 12 hrs | No | Snapshots: 3 days |
| Development | None (ephemeral) | No | N/A |

Restore drills use **staging** snapshots to avoid impacting production.

### Exporting a Snapshot

Snapshots can be **restore to a new cluster** (Atlas-internal, faster) or **downloaded as a compressed archive** for off-site storage:

```bash
# Download a snapshot via Atlas CLI
atlas backups snapshots download <clusterName> <snapshotId> --output backup.archive

# Restore from downloaded archive
mongorestore --uri="<MONGODB_URI>" --archive=backup.archive --drop
```

---

## Manual Backup (mongodump)

For ad-hoc backups (pre-migration, pre-deployment of destructive changes):

```bash
# Full database dump
mongodump --uri="<MONGODB_URI>" --archive=pre-migration-$(date +%Y%m%d_%H%M%S).archive

# Single collection
mongodump --uri="<MONGODB_URI>" --collection=projects --archive=projects-$(date +%Y%m%d).archive

# Exclude audit log (often large; restore separately if needed)
mongodump --uri="<MONGODB_URI>" --excludeCollection=auditlogs --archive=no-audit-$(date +%Y%m%d).archive
```

**Safety rules:**
- Run `mongodump` **from the same region** as the cluster (minimize network egress cost).
- Encrypt the archive if it leaves Atlas's network boundary (`gpg --symmetric` or upload to encrypted S3).
- Keep the archive only until the operation is verified successful — then delete it.

---

## Restore Drill Procedure

Run this drill quarterly on the **staging** cluster. Full walkthrough:

### Step 1: Select a snapshot

```bash
# List available snapshots (Atlas CLI)
atlas backups snapshots list <clusterName>

# Or via Atlas API
curl -s -u "$ATLAS_PUBLIC_KEY:$ATLAS_PRIVATE_KEY" \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/$PROJECT_ID/clusters/$CLUSTER_NAME/backup/snapshots" \
  | jq '.results[] | {id: ._id, created: .createdAt, status: .status}'
```

Pick a snapshot older than the last known-good deploy to simulate a realistic recovery scenario.

### Step 2: Restore to a temporary cluster

```bash
# Option A: Restore to a new Atlas cluster (recommended)
atlas clusters create <temp-cluster-name> \
  --provider AWS \
  --region US_EAST_1 \
  --tier M10 \
  --backupSnapshotId <snapshotId>

# Wait for the cluster to reach IDLE state
atlas clusters watch <temp-cluster-name>

# Option B: Restore via mongorestore (from local archive)
mongorestore \
  --uri="mongodb+srv://<user>:<pass>@<temp-cluster>.mongodb.net/constructtrack" \
  --archive=backup.archive \
  --drop
```

### Step 3: Verify data integrity

Run the verification script:

```bash
npm run backup:verify -- --uri "mongodb+srv://<user>:<pass>@<temp-cluster>.mongodb.net/constructtrack"
```

The script checks:
- All collections exist and have documents
- Counts match expected ranges (from monitoring)
- Tenant isolation sample (first tenant from `tenants` collection has related rows in other collections)
- Indexes are present
- Last audit log entry timestamp is recent (relative to snapshot time)

### Step 4: Functional smoke test

```bash
# Point the API to the temp cluster
MONGODB_URI="<temp-cluster-uri>" npm run start &

# Run a representative smoke
curl -s http://localhost:4000/api/v1/health | jq .
curl -s http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@demo.com","password":"Demo@123!"}' \
  | jq .

# Register, create project, create task — if the API can do these,
# the backup is usable.
```

### Step 5: Tear down

```bash
# Delete the temp cluster
atlas clusters delete <temp-cluster-name>

# Remove local archives
rm -f backup-*.archive
```

### Step 6: Log the drill

Record the drill outcome in a run-log entry:

```
Date: 2026-07-10
Tester: <name>
Snapshot used: <snapshotId> (2026-07-09T12:00:00Z)
Temp cluster: <temp-cluster-name>
Verification: PASS / FAIL
Smoke test: PASS / FAIL
Restore time: ~35 min (snapshot → API responding)
Notes: ...
```

---

## Backup Verification Checklist

Before every production release and quarterly as a standalone drill:

- [ ] Atlas Cloud Backup is enabled with PITR.
- [ ] At least one snapshot exists within the expected window.
- [ ] A restore drill has been completed within the last 90 days.
- [ ] The `backup:verify` script passes against a restored cluster.
- [ ] Functional smoke tests pass against a restored cluster.
- [ ] The temp cluster was deleted after the drill.
- [ ] Backup retention policy is documented and matches compliance requirements.

---

## Local Development Backups

For developers working with local data:

```bash
# Dump local MongoDB to a timestamped archive
npm run backup:local

# Restore local MongoDB from latest archive
npm run restore:local
```

Backup archives are stored in `.backups/` (gitignored). The seed script (`npm run seed`) can also regenerate demo data.

---

## Incident Recovery Playbook

### Scenario: Accidental data loss (bulk delete / bad migration)

1. **Stop writes** to the affected cluster immediately (disable API auto-scaling / scale to 0).
2. **Identify the PITR restore point** — find the latest timestamp before the incident.
3. **Restore to a new temp cluster** using the PITR timestamp:
   ```bash
   atlas clusters create <recovery-cluster> \
     --provider AWS --region US_EAST_1 --tier M10 \
     --pitrRestoreTimestamp "<ISO-8601 before incident>"
   ```
4. **Verify data** on the temp cluster (verification script + smoke tests).
5. **Swap** the application connection string to point at the recovery cluster.
6. **Investigate** the root cause and update runbooks.

### Scenario: Cluster unavailability (region outage)

1. Atlas cross-region snapshot → promote a backup cluster in the healthy region.
2. Update DNS / connection string to the healthy cluster.
3. Follow the same verification steps.
4. Once the primary region is restored, re-enable PITR and sync data forward.

### Scenario: Accidental user-triggered data corruption

1. `mongodump` the current state (preserve evidence).
2. Restore from the last known-good PITR point.
3. Extract only the affected tenant's data from the dump.
4. Merge the tenant's good data back into production.
5. Audit-log the restoration event.
