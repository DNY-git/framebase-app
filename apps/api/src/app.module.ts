/**
 * Root application module.
 *
 * Wires the API: configuration, database, audit logging, health checks,
 * authentication, global pipes/filters/interceptors, and the global JWT
 * guard. Feature modules (projects, tasks, etc.) are added here as they
 * are built in Phase 2+.
 */
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { configuration, AppConfig } from './config/configuration';
import { ConfigValidationService } from './config/validation';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { EquipmentModule } from './modules/equipment/equipment.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AiModule } from './modules/ai/ai.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { AuthorizationModule } from './common/authorization/authorization.module';
import { RateLimitModule } from './common/rate-limiter/rate-limit.module';
import { AppController } from './app.controller';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    DatabaseModule,
    AuditModule,
    AuthModule,
    ProjectsModule,
    TasksModule,
    DashboardModule,
    EquipmentModule,
    InventoryModule,
    ReportsModule,
    NotificationsModule,
    AiModule,
    DocumentsModule,
    MetricsModule,
    AuthorizationModule,
    RateLimitModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    ConfigValidationService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
    {
      // Global JWT guard — every route is protected unless @Public().
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      // Global Roles guard — enforces tenant-level role authorization.
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule implements NestModule {
  constructor(private readonly configValidation: ConfigValidationService) {}

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
    this.configValidation.validate();
  }

  // Note: ConfigService is injected in the constructor for future use
  // (e.g., feature flags). Currently used only by validation.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static forRoot(_configService?: ConfigService<AppConfig>) {
    return { module: AppModule };
  }
}
