/**
 * Root app controller — exposes basic API metadata.
 *
 * Provides a root endpoint that returns API version and name. Useful for
 * smoke-testing that the API is up and the version is deployed.
 * Wrapped in the standard response envelope by ResponseInterceptor.
 */
import { Controller, Get } from '@nestjs/common';

@Controller('api/v1')
export class AppController {
  @Get()
  root(): { name: string; version: string } {
    return {
      name: 'ConstructTrack API',
      version: '0.1.0',
    };
  }
}
