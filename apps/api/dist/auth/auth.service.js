"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const database_service_1 = require("../database/database.service");
const bcrypt = __importStar(require("bcrypt"));
let AuthService = class AuthService {
    db;
    jwtService;
    config;
    constructor(db, jwtService, config) {
        this.db = db;
        this.jwtService = jwtService;
        this.config = config;
    }
    async login(loginDto, ipAddress) {
        const { email, password } = loginDto;
        const userResult = await this.db.query(`SELECT u.id, u.email, u.password_hash, u.is_active, u.locked_until,
              u.failed_login_attempts, ur.company_id, r.name as role_name
       FROM users u
       LEFT JOIN user_company_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.email = $1 AND u.deleted_at IS NULL
       LIMIT 1`, [email]);
        if (userResult.rows.length === 0) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const user = userResult.rows[0];
        if (!user.is_active) {
            throw new common_1.ForbiddenException('Account is inactive');
        }
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            throw new common_1.ForbiddenException('Account is locked. Contact administrator.');
        }
        const passwordValid = await bcrypt.compare(password, user.password_hash);
        if (!passwordValid) {
            const newAttempts = (user.failed_login_attempts || 0) + 1;
            const lockUntil = newAttempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null;
            await this.db.query(`UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3`, [newAttempts, lockUntil, user.id]);
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        await this.db.query(`UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW(), last_login_ip = $1 WHERE id = $2`, [ipAddress, user.id]);
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role_name,
            companyId: user.company_id,
        };
        const accessToken = this.jwtService.sign(payload);
        const refreshToken = this.jwtService.sign(payload, {
            secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
            expiresIn: this.config.getOrThrow('JWT_REFRESH_EXPIRES_IN'),
        });
        return {
            accessToken,
            refreshToken,
            user: { id: user.id, email: user.email, role: user.role_name, companyId: user.company_id },
        };
    }
    async getProfile(userId) {
        const result = await this.db.query(`SELECT u.id, u.email, u.name, ur.company_id,
              r.name as role_name, c.name as company_name
       FROM users u
       LEFT JOIN user_company_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       LEFT JOIN companies c ON c.id = ur.company_id
       WHERE u.id = $1 AND u.deleted_at IS NULL`, [userId]);
        if (result.rows.length === 0) {
            throw new common_1.UnauthorizedException('User not found');
        }
        return result.rows[0];
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map