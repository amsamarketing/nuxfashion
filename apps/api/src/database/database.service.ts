import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResult, QueryResultRow } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    this.pool = new Pool({
      connectionString: this.config.getOrThrow<string>('DATABASE_URL'),
      ssl: { rejectUnauthorized: false },
      max: 10,
    });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async query<T extends QueryResultRow = QueryResultRow>(text: string, values?: any[]): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, values);
  }
}
