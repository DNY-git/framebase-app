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
import { AuthorizationModule } from './common/authorization/authorization.module';
import { AppController } from './app.controller';

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
    AuthorizationModule,
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

  configure(_consumer: MiddlewareConsumer): void {
    // Fail fast on invalid configuration at bootstrap.
    this.configValidation.validate();
  }

  // Note: ConfigService is injected in the constructor for future use
  // (e.g., feature flags). Currently used only by validation.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static forRoot(_configService?: ConfigService<AppConfig>) {
    return { module: AppModule };
  }
}
