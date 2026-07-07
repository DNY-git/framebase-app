/**
 * Database connectivity service.
 *
 * Wraps the Mongoose connection (provided by MongooseModule) for health
 * checks. Because DatabaseModule uses `lazyConnection: true`, the connection
 * object exists immediately; its `readyState` reflects the live connection
 * status. When MONGODB_URI is not configured, the URI is an inert placeholder
 * and readyState stays 0 (disconnected) — connection attempts fail fast.
 *
 * This service never throws — health checks must always be able to respond.
 *
 * See ADR-002 for the rationale on MongoDB Atlas + Mongoose.
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

export type DatabaseStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  onModuleInit(): void {
    // Wire up connection event listeners so logs reflect state changes.
    this.connection.on('connected', () => {
      this.logger.log('MongoDB Atlas connected');
    });
    this.connection.on('error', (err: Error) => {
      this.logger.warn(`MongoDB error: ${err.message}`);
    });
    this.connection.on('disconnected', () => {
      this.logger.debug('MongoDB disconnected');
    });
  }

  /**
   * Returns the current database connection state for health checks.
   * Never throws — health checks must always be able to respond.
   *
   * Mongoose readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting.
   */
  getStatus(): { status: DatabaseStatus; error: string | null } {
    const readyState = this.connection.readyState;
    let status: DatabaseStatus;
    switch (readyState) {
      case 1:
        status = 'connected';
        break;
      case 2:
      case 3:
        status = 'connecting';
        break;
      default:
        status = 'disconnected';
    }
    return { status, error: null };
  }

  /**
   * Performs an actual ping against MongoDB Atlas.
   * Used for deep health checks. Returns false if not connected or if the
   * ping fails — never throws.
   */
  async ping(): Promise<boolean> {
    try {
      if (this.connection.readyState !== 1) {
        return false;
      }
      const admin = this.connection.db?.admin();
      if (!admin) {
        return false;
      }
      await admin.ping();
      return true;
    } catch {
      return false;
    }
  }
}
