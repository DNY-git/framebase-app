import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Model, HydratedDocument } from 'mongoose';
import { BaseRepository } from './base.repository';
import { TenantId, EntityId } from '@constructtrack/types';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

// 1. Define a dummy schema
interface Dummy {
  id: string;
  name: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

const dummySchema = new mongoose.Schema({
  name: { type: String, required: true },
  tenantId: { type: String, required: true },
}, { timestamps: true });

type DummyDocument = HydratedDocument<Dummy>;

// 2. Define the Test Repository extending BaseRepository
class DummyRepository extends BaseRepository<
  Dummy,
  DummyDocument,
  { name: string },
  { name?: string }
> {
  protected toDomain(doc: DummyDocument): Dummy {
    return {
      id: doc._id.toString(),
      name: doc.name,
      tenantId: doc.tenantId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createdAt: (doc as any).createdAt,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updatedAt: (doc as any).updatedAt,
    };
  }

  protected toCreateDoc(tenantId: TenantId, data: { name: string }): Partial<DummyDocument> {
    return {
      name: data.name,
      tenantId,
    };
  }

  protected toUpdateDoc(data: { name?: string }): Partial<DummyDocument> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: any = {};
    if (data.name !== undefined) update.name = data.name;
    return update;
  }
}

describe('BaseRepository - Tenant Isolation', () => {
  let mongoServer: MongoMemoryServer;
  let connection: mongoose.Connection;
  let DummyModel: Model<DummyDocument>;
  let repo: DummyRepository;

  const tenantA = 'tenant-a' as TenantId;
  const tenantB = 'tenant-b' as TenantId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    connection = await mongoose.createConnection(uri).asPromise();
    DummyModel = connection.model<DummyDocument>('Dummy', dummySchema);
    repo = new DummyRepository(DummyModel);
  }, 60000);

  afterAll(async () => {
    if (connection) {
      await connection.dropDatabase();
      await connection.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await DummyModel.deleteMany({});
  });

  it('create() injects tenantId', async () => {
    const doc = await repo.create(tenantA, { name: 'Item A' });
    expect(doc.tenantId).toBe(tenantA);

    const raw = await DummyModel.findById(doc.id).lean();
    expect(raw?.tenantId).toBe(tenantA);
  });

  describe('cross-tenant isolation', () => {
    let docA: Dummy;

    beforeEach(async () => {
      docA = await repo.create(tenantA, { name: 'Tenant A Data' });
      await repo.create(tenantB, { name: 'Tenant B Data' });
    });

    it('findById() fails if tenantId does not match', async () => {
      const foundA = await repo.findById(tenantA, docA.id as EntityId);
      expect(foundA).not.toBeNull();
      expect(foundA?.name).toBe('Tenant A Data');

      // Tenant B tries to read Tenant A's document
      const foundB = await repo.findById(tenantB, docA.id as EntityId);
      expect(foundB).toBeNull();
    });

    it('find() only returns documents for the requested tenant', async () => {
      const resultA = await repo.find(tenantA, {});
      expect(resultA.totalItems).toBe(1);
      expect(resultA.items[0].name).toBe('Tenant A Data');

      const resultB = await repo.find(tenantB, {});
      expect(resultB.totalItems).toBe(1);
      expect(resultB.items[0].name).toBe('Tenant B Data');
    });

    it('update() fails if tenantId does not match', async () => {
      const updatedA = await repo.update(tenantA, docA.id as EntityId, { name: 'Updated A' });
      expect(updatedA).not.toBeNull();
      expect(updatedA?.name).toBe('Updated A');

      // Tenant B tries to update Tenant A's document
      const updatedB = await repo.update(tenantB, docA.id as EntityId, { name: 'Hacked A' });
      expect(updatedB).toBeNull();

      // Verify it wasn't updated
      const verifyA = await repo.findById(tenantA, docA.id as EntityId);
      expect(verifyA?.name).toBe('Updated A');
    });

    it('delete() fails if tenantId does not match', async () => {
      // Tenant B tries to delete Tenant A's document
      const deletedB = await repo.delete(tenantB, docA.id as EntityId);
      expect(deletedB).toBe(false);

      // Verify it still exists
      const verifyA = await repo.findById(tenantA, docA.id as EntityId);
      expect(verifyA).not.toBeNull();

      // Tenant A can delete it
      const deletedA = await repo.delete(tenantA, docA.id as EntityId);
      expect(deletedA).toBe(true);
      
      const verifyAAfter = await repo.findById(tenantA, docA.id as EntityId);
      expect(verifyAAfter).toBeNull();
    });

    it('exists() respects tenantId', async () => {
      expect(await repo.exists(tenantA, { _id: docA.id })).toBe(true);
      expect(await repo.exists(tenantB, { _id: docA.id })).toBe(false);
    });

    it('count() respects tenantId', async () => {
      expect(await repo.count(tenantA, {})).toBe(1);
      expect(await repo.count(tenantB, {})).toBe(1);
    });
  });
});
