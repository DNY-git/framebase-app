import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { NotificationRepository } from './repositories/notification.repository';
import { NotificationSubscriptionRepository } from './repositories/notification-subscription.repository';
import { AuthContext } from '../../common/authorization/authorization.types';
import { Role } from '@constructtrack/types';
import { DomainException } from '../../common/exceptions/domain.exception';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notifRepo: typeof mockNotifRepo;
  let subRepo: typeof mockSubRepo;

  const auth: AuthContext = {
    userId: 'user-1',
    tenantId: 'tenant-1',
    role: Role.PROJECT_MANAGER,
  };

  const mockNotifRepo = {
    create: vi.fn(),
    findByUser: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    countUnread: vi.fn(),
  };

  const mockSubRepo = {
    findByUser: vi.fn(),
    upsert: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: NotificationRepository, useValue: mockNotifRepo },
        { provide: NotificationSubscriptionRepository, useValue: mockSubRepo },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    notifRepo = module.get(NotificationRepository);
    subRepo = module.get(NotificationSubscriptionRepository);
  });

  describe('create', () => {
    it('creates a notification', async () => {
      const dto = {
        userId: 'user-2',
        type: 'task.assigned' as const,
        title: 'Task Assigned',
        body: 'You have been assigned a task',
      };
      notifRepo.create.mockResolvedValue({ id: 'notif-1', ...dto, tenantId: 'tenant-1', createdAt: new Date() });

      const result = await service.create(auth, dto);

      expect(result.id).toBe('notif-1');
      expect(notifRepo.create).toHaveBeenCalledWith('tenant-1', dto);
    });
  });

  describe('findMyNotifications', () => {
    it('returns paginated notifications', async () => {
      const paginated = {
        items: [{ id: 'notif-1', title: 'Test' }],
        page: 1, perPage: 20, totalItems: 1, totalPages: 1,
      };
      notifRepo.findByUser.mockResolvedValue(paginated);

      const result = await service.findMyNotifications(auth, { page: 1, perPage: 20 });

      expect(result.items).toHaveLength(1);
      expect(notifRepo.findByUser).toHaveBeenCalledWith('tenant-1', 'user-1', { page: 1, perPage: 20 }, false);
    });

    it('filters unread when flagged', async () => {
      notifRepo.findByUser.mockResolvedValue({ items: [], page: 1, perPage: 20, totalItems: 0, totalPages: 1 });

      await service.findMyNotifications(auth, { page: 1, perPage: 20 }, true);

      expect(notifRepo.findByUser).toHaveBeenCalledWith('tenant-1', 'user-1', { page: 1, perPage: 20 }, true);
    });
  });

  describe('markAsRead', () => {
    it('marks a notification as read', async () => {
      notifRepo.markAsRead.mockResolvedValue({ id: 'notif-1', readAt: new Date() });

      const result = await service.markAsRead(auth, 'notif-1');

      expect(result.id).toBe('notif-1');
      expect(notifRepo.markAsRead).toHaveBeenCalledWith('tenant-1', 'user-1', 'notif-1');
    });

    it('throws if notification not found', async () => {
      notifRepo.markAsRead.mockResolvedValue(null);

      await expect(service.markAsRead(auth, 'bad-id')).rejects.toThrow(DomainException);
    });
  });

  describe('markAllAsRead', () => {
    it('marks all as read and returns count', async () => {
      notifRepo.markAllAsRead.mockResolvedValue(3);

      const result = await service.markAllAsRead(auth);

      expect(result.count).toBe(3);
      expect(notifRepo.markAllAsRead).toHaveBeenCalledWith('tenant-1', 'user-1');
    });
  });

  describe('countUnread', () => {
    it('returns the unread count', async () => {
      notifRepo.countUnread.mockResolvedValue(5);

      const result = await service.countUnread(auth);

      expect(result.count).toBe(5);
      expect(notifRepo.countUnread).toHaveBeenCalledWith('tenant-1', 'user-1');
    });
  });

  describe('subscriptions', () => {
    it('finds user subscriptions', async () => {
      subRepo.findByUser.mockResolvedValue([{ id: 'sub-1', type: 'task.assigned', channels: ['in_app'] }]);

      const result = await service.findMySubscriptions(auth);

      expect(result).toHaveLength(1);
      expect(subRepo.findByUser).toHaveBeenCalledWith('tenant-1', 'user-1');
    });

    it('upserts a subscription', async () => {
      subRepo.upsert.mockResolvedValue({ id: 'sub-1', type: 'task.assigned', channels: ['in_app', 'email'] });

      const result = await service.upsertSubscription(auth, 'task.assigned', ['in_app', 'email']);

      expect(result.id).toBe('sub-1');
      expect(subRepo.upsert).toHaveBeenCalledWith('tenant-1', 'user-1', 'task.assigned', ['in_app', 'email']);
    });

    it('bulk upserts multiple subscriptions', async () => {
      subRepo.upsert
        .mockResolvedValueOnce({ id: 'sub-1', type: 'task.assigned', channels: ['in_app'] })
        .mockResolvedValueOnce({ id: 'sub-2', type: 'inventory.below_reorder', channels: ['email'] });

      const result = await service.bulkUpsertSubscriptions(auth, [
        { type: 'task.assigned', channels: ['in_app'] },
        { type: 'inventory.below_reorder', channels: ['email'] },
      ]);

      expect(result).toHaveLength(2);
      expect(subRepo.upsert).toHaveBeenCalledTimes(2);
    });
  });
});
