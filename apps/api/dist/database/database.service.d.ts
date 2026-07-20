import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueryResult, QueryResultRow } from 'pg';
export declare class DatabaseService implements OnModuleInit, OnModuleDestroy {
    private config;
    private pool;
    constructor(config: ConfigService);
    onModuleInit(): void;
    onModuleDestroy(): Promise<void>;
    query<T extends QueryResultRow = QueryResultRow>(text: string, values?: any[]): Promise<QueryResult<T>>;
}
