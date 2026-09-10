/**
 * Root app controller — exposes basic API metadata.
 *
 * Provides a root endpoint that returns API version and name. Useful for
 * smoke-testing that the API is up and the version is deployed.
 * Wrapped in the standard response envelope by ResponseInterceptor.
 */
import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from './config/configuration';

@Controller()
export class AppController {
  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  @Get()
  root(): { name: string; version: string } {
    return {
      name: `${this.configService.get<string>('appName', { infer: true })} API`,
      version: '0.1.0',
    };
  }
}
