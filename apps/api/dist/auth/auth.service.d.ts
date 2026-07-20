import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private db;
    private jwtService;
    private config;
    constructor(db: DatabaseService, jwtService: JwtService, config: ConfigService);
    login(loginDto: LoginDto, ipAddress: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: any;
            email: any;
            role: any;
            companyId: any;
        };
    }>;
    getProfile(userId: string): Promise<import("pg").QueryResultRow>;
}
