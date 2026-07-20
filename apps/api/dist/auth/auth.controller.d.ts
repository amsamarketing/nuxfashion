import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import type { Request } from 'express';
export declare class AuthController {
    private auth;
    constructor(auth: AuthService);
    login(dto: LoginDto, req: Request): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: any;
            email: any;
            role: any;
            companyId: any;
        };
    }>;
    getProfile(req: any): Promise<import("pg").QueryResultRow>;
}
