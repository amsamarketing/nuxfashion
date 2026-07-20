import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
export declare class SupabaseService {
    private config;
    private client;
    private adminClient;
    constructor(config: ConfigService);
    getClient(): SupabaseClient;
    getAdminClient(): SupabaseClient;
}
