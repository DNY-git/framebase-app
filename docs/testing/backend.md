# Testing: Backend

> How we test the NestJS backend of ConstructTrack: service unit tests (mocked repos), integration tests (real MongoDB), auth/tenant-isolation tests, and schema validation tests. The backend is where security bugs are most damaging, so it gets the most rigorous test coverage.

Companion docs: [strategy.md](./strategy.md), [frontend.md](./frontend.md), [../architecture/backend.md](../architecture/backend.md), [../database/security.md](../database/security.md), [../security/authorization.md](../security/authorization.md).

---

## Table of Contents

- [Overview](#overview)
- [What We Test](#what-we-test)
- [Service Unit Tests](#service-unit-tests)
- [Integration Tests](#integration-tests)
- [Auth & Tenant-Isolation Tests](#auth--tenant-isolation-tests)
- [Schema Validation Tests](#schema-validation-tests)
- [Worker/Queue Tests](#workerqueue-tests)
- [Patterns & Conventions](#patterns--conventions)
- [What We Don't Test](#what-we-dont-test)

---

## Overview

Backend tests answer: *does this service enforce the right business rules, authorize correctly, and persist accurately?* We test at two layers: unit (fast, mocked repos) for business logic, and integration (real MongoDB via mongodb-memory-server) for queries, transactions, and security. Tools: **Vitest** with Jest-compatible matchers.

---

## What We Test

| Concern | How | Where |
| --- | --- | --- |
| Business rules | Service method with mocked repo; assert output/errors | Unit |
| Validation | DTO + class-validator; assert rejection of bad input | Unit |
| Authorization | Service call as different roles; assert allow/deny | Unit + integration |
| Tenant isolation | Cross-tenant access attempt; assert failure | Integration |
| Data persistence | Service call → real DB → assert query result | Integration |
| Transactions | Multi-write operation; assert all-or-nothing | Integration |
| Audit logging | Mutation → assert audit_log entry exists | Integration |
| Schema validation | Invalid data → Mongoose validation error | Unit + Integration |
| Error mapping | Domain exception → assert HTTP status + envelope code | Unit |
| Queue jobs | Enqueue → worker processes → assert side effect | Integration |

---

## Service Unit Tests

Test a service method with its dependencies (repositories, other services) mocked.

```ts
describe('TasksService', () => {
  let service: TasksService;
  let repo: MockProxy<TasksRepository>;

  beforeEach(() => {
    repo = mock<TasksRepository>();
    service = new TasksService(repo, mock<AuditService>());
  });

  it('creates a task with validation and audit', async () => {
    repo.create.mockResolvedValue(taskFixture);
    const result = await service.create(adminUser, createDto);
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ tenantId }));
    expect(result.status).toBe('todo');
  });

  it('rejects creation when project is on_hold', async () => { ... });
  it('throws ForbiddenException when crew member edits another user task', async () => { ... });
});
```

**Patterns:**

- **Mock at the repository boundary** — services call repos; we mock repos. Never mock the ORM directly.
- **Test the decision, not the data.** We assert the *right* repo call was made (with correct tenantId, params), not that it returns exact fixture rows.
- **Error tests:** assert the correct domain exception type and code.
- **Naming:** `should <expected behavior> when <condition>`.

---

## Integration Tests

Test a service **against a real MongoDB** (via mongodb-memory-server). These prove that queries, transactions, and tenant isolation actually work.

```ts
describe('ProjectsService (integration)', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const module = await createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => { await app.close(); await mongoServer.stop(); });

  it('creates a project and it is queryable with tenant scope', async () => {
    const project = await service.create(adminUser, createDto);
    const found = await service.findOne(adminUser, project.id);
    expect(found).not.toBeNull();
  });

  it('audit_log is written alongside the mutation', async () => { ... });
});
```

**Key properties:**

- **Disposable databases** — each suite spins up fresh mongodb-memory-server; nothing persists between runs.
- **Real MongoDB** — the whole point is to exercise the real query layer, not mocks.
- **No ORM mocks** — Mongoose validation, queries, and indexes are all exercised.

---

## Auth & Tenant-Isolation Tests

These are the most critical backend tests. Every feature module must include them.

### Cross-tenant isolation test (required per feature)

```ts
it('CANNOT read a task in another tenant', async () => {
  // Setup: create a task in tenant A
  const task = await createTestTask({ tenantId: tenantA, projectId: projectA.id });

  // Act: try to read as a user of tenant B
  const result = await service.findOne(tenantBUser, task.id);

  // Assert: must throw (not return data)
  expect(result).toBeNull(); // or expect thrown NotFoundException
});
```

### Role-permission tests (required per mutating endpoint)

```ts
it('viewer cannot create a task', async () => {
  await expect(service.create(viewerUser, dto)).rejects.toThrow(ForbiddenException);
});

it('engineer can create a task but crew cannot assign to arbitrary users', async () => { ... });
```

### Audit tests

```ts
it('task creation writes an audit log entry with before=null and after=task', async () => {
  await service.create(adminUser, dto);
  const audit = await model.findOne({ entityType: 'task', action: 'create' }).exec();
  expect(audit).not.toBeNull();
  expect(audit.actorId).toBe(adminUser.id);
  expect(audit.after).toMatchObject({ title: dto.title });
});
```

---

## Schema Validation Tests

- **Mongoose validation** — verify that required fields, enum values, and custom validators reject invalid data at the schema level.
- **Index verification** — confirm expected indexes exist via `collection.indexInformation()`.
- **Backward compatibility** — new fields with defaults should work with existing documents without migration.

---

## Worker/Queue Tests

BullMQ workers are tested by enqueueing a job and asserting the side effect:

```ts
it('reports worker generates a PDF and stores the artifact', async () => {
  const job = await reportsQueue.add('generate', { templateId, params });
  await processJob(job); // run the worker inline in the test
  expect(mockStorage.write).toHaveBeenCalledWith(expect.stringContaining('.pdf'));
  expect(job.state).toBe('completed');
});
```

Integration-level queue tests use a real Redis; the worker runs inline for deterministic timing.

---

## Patterns & Conventions

- **One `describe` per service** in `__tests__/` adjacent to the service file.
- **Test factories** (`src/__tests__/factories/`) for creating valid entities with minimal overrides.
- **Test users** (`adminUser`, `managerUser`, `crewUser`, `viewerUser`) with correct roles; created per-suite or per-test.
- **Two tenants** (`tenantA`, `tenantB`) for isolation tests — never shared.
- **Cleanup:** each test creates its own data and relies on the disposable mongodb-memory-server teardown; no manual cleanup needed.

---

## What We Don't Test

- **Mongoose internals** — we trust the ODM's query builder; we test that our service calls it correctly.
- **NestJS DI wiring** — module bootstrapping is validated by integration tests; we don't unit-test `@Module()` definitions.
- **HTTP framework** — controller tests are thin; the real logic lives in services.
- **Job queue internals** — we trust the InMemoryJobQueue; we test that our job processors produce the right side effects.

---

*Backend tests are where security bugs are caught. A missing tenantId filter, a skipped auth check, or a transaction without audit — these are the defects that break the core promise of a multi-tenant platform. Every one of them must have a test that fails if the protection is removed.*
