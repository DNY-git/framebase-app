/**
 * Database module — wires Mongoose to MongoDB Atlas.
 *
 * Uses MongooseModule.forRootAsync with `lazyConnection: true` so the
 * connection object is returned instantly without blocking NestFactory.
 * Mongoose attempts the actual connection in the background; the app starts
 * regardless of database availability. Feature modules use @InjectModel()
 * normally — queries simply wait (or fail) until the connection is live.
 *
 * When MONGODB_URI is absent (or not a mongodb://... string), we pass a
 * non-connecting placeholder URI with a near-zero server-selection timeout
 * so the failed connection attempt doesn't slow startup. DatabaseService
 * reports "disconnected" in this case (graceful degradation).
 *
 * See ADR-002 for the rationale on MongoDB Atlas + Mongoose.
 */
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import type { AppConfig } from '../config/configuration';
import { DatabaseService } from './database.service';

// Mongoose requires a URI to construct a connection; this inert placeholder
// points at localhost on an unreachable port so model registration succeeds
// without a real database. Combined with a near-zero timeout below, the
// failed connection attempt completes instantly (no DNS delay, no 5s wait).
const INERT_URI = 'mongodb://127.0.0.1:9/constructtrack';

@Global()
@Module({
  imports: [
    ConfigModule,
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const uri = config.get<string>('mongodbUri', { infer: true });
        const isConfigured = uri !== null;
        return {
          uri: uri ?? INERT_URI,
          lazyConnection: true,
          // When no real URI is configured, fail the connection attempt
          // almost instantly (1ms) so startup isn't delayed. When a real
          // URI is present, allow up to 5s for server selection.
          serverSelectionTimeoutMS: isConfigured ? 5000 : 1,
          connectTimeoutMS: isConfigured ? 5000 : 1,
        };
      },
    }),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService, MongooseModule],
})
export class DatabaseModule {}
